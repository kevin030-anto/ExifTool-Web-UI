# ExifTool Web UI

A professional local web interface for ExifTool.

ExifTool is a powerful command-line application used to read, write, and edit metadata in image, audio, and video files. It supports a wide range of formats and provides comprehensive access to metadata tags. Because ExifTool operates via the command line, it can be daunting for users who prefer graphical tools. This project wraps ExifTool with a simple **web interface**, allowing users to interact with metadata through a browser instead of typing commands.

The web interface (`app.py`, `static/`, `templates/`) handles file uploads and displays ExifTool output, while the underlying ExifTool application (`exiftool_files/`, `exiftool.exe`) performs the actual metadata processing.

## Features
- **Multiple Image Upload**: Drag and drop support.
- **View Metadata**: Executes `exiftool image.png` and displays the output.
- **Clean Metadata**: Executes `exiftool -all= image.png` to remove all metadata.
- **Download**: Download cleaned images.

> **Note:** This project includes ExifTool version `exiftool-13.45_64`. You can replace it with a newer [ExifTool](https://exiftool.org/install.html) executable if desired. If the ExifTool Web UI is not working, you may run the `exiftool-13.45_64` application directly from the project to process your files.

## How to Run

1. Ensure you have Python installed.
2. create/activate a virtualenv:
   ```bash
   python -m venv .venv
   ```
   ```bash
   .venv\Scripts\Activate.ps1
   ```
4. Install dependencies:
   ```bash
   pip install flask
   ```
5. Run the application:
   ```bash
   python app.py
   ```

## Project Structure
- `app.py`: Flask backend server.
- `static/`: CSS and Client-side JavaScript.
- `templates/`: HTML files.
- `uploads/`: Temporary storage for uploaded files.
- `exiftool.exe`: The core executable.

## 💡 Author


GitHub: [@kevin030-anto](https://github.com/kevin030-anto)
