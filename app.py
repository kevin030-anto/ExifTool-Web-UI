import os
import subprocess
import json
import zipfile
import io
from flask import Flask, render_template, request, jsonify, send_file, send_from_directory
from werkzeug.utils import secure_filename

app = Flask(__name__)
app.config['UPLOAD_FOLDER'] = os.path.join(os.getcwd(), 'uploads')
app.config['EXIFTOOL_PATH'] = os.path.join(os.getcwd(), 'exiftool.exe')

# Ensure upload directory exists
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/upload', methods=['POST'])
def upload_files():
    if 'files' not in request.files:
        return jsonify({'error': 'No files part'}), 400
    
    files = request.files.getlist('files')
    uploaded_files = []
    
    for file in files:
        if file.filename == '':
            continue
        filename = secure_filename(file.filename)
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        file.save(filepath)
        uploaded_files.append(filename)
        
    return jsonify({'files': uploaded_files})

@app.route('/metadata', methods=['POST'])
def get_metadata():
    data = request.json
    filename = data.get('filename')
    if not filename:
        return jsonify({'error': 'Filename required'}), 400
        
    filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
    if not os.path.exists(filepath):
        return jsonify({'error': 'File not found'}), 404
        
    # Run exiftool image.png
    try:
        # Using -j for JSON output which is easier to parse, but user asked for "exiftool image.png" standard output
        # strictly speaking. However, to display it nicely, JSON is better. content is content.
        # But if I want to show exactly what the CLI shows, I should just capture stdout.
        # Let's start with standard text output as implied by the user request "see metadata".
        
        command = [app.config['EXIFTOOL_PATH'], filepath]
        result = subprocess.run(command, capture_output=True, text=True)
        
        if result.returncode != 0:
            return jsonify({'error': result.stderr}), 500
            
        return jsonify({'output': result.stdout})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/clean', methods=['POST'])
def clean_metadata():
    data = request.json
    filename = data.get('filename')
    if not filename:
        return jsonify({'error': 'Filename required'}), 400
        
    filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
    if not os.path.exists(filepath):
        return jsonify({'error': 'File not found'}), 404
        
    # Run exiftool -all= image.png
    try:
        command = [app.config['EXIFTOOL_PATH'], '-all=', filepath]
        result = subprocess.run(command, capture_output=True, text=True)
        
        if result.returncode != 0:
            return jsonify({'error': result.stderr}), 500
            
        # Exiftool creates a _original backup by default. We might want to mention that or ignore it.
        # For now, we return success.
        
        return jsonify({'output': result.stdout, 'success': True})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/clean_batch', methods=['POST'])
def clean_batch_metadata():
    data = request.json
    filenames = data.get('filenames', [])
    if not filenames:
        return jsonify({'error': 'No filenames provided'}), 400
    
    results = {}
    for filename in filenames:
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        if not os.path.exists(filepath):
            results[filename] = {'success': False, 'error': 'File not found'}
            continue
            
        try:
            command = [app.config['EXIFTOOL_PATH'], '-all=', filepath]
            result = subprocess.run(command, capture_output=True, text=True)
            if result.returncode != 0:
                results[filename] = {'success': False, 'error': result.stderr}
            else:
                results[filename] = {'success': True}
        except Exception as e:
            results[filename] = {'success': False, 'error': str(e)}
            
    return jsonify({'results': results})

@app.route('/download_zip', methods=['POST'])
def download_zip():
    data = request.json
    filenames = data.get('filenames', [])
    if not filenames:
        return jsonify({'error': 'No filenames provided'}), 400
        
    # Create a zip file in memory
    memory_file = io.BytesIO()
    with zipfile.ZipFile(memory_file, 'w', zipfile.ZIP_DEFLATED) as zf:
        for filename in filenames:
            filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
            if os.path.exists(filepath):
                zf.write(filepath, filename)
    
    memory_file.seek(0)
    return send_file(memory_file, download_name='cleaned_images.zip', as_attachment=True)


@app.route('/download/<filename>')
def download_file(filename):
    return send_file(os.path.join(app.config['UPLOAD_FOLDER'], filename), as_attachment=True)

if __name__ == '__main__':
    app.run(debug=True, port=5000)
