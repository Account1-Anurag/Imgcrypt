from flask import Flask, render_template, request, send_file
import cv2
import numpy as np
import os
from helper_functions import encode, decode_image

app = Flask(__name__)
UPLOAD_FOLDER = "static/uploads"
RESULT_FOLDER = "static/results"
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(RESULT_FOLDER, exist_ok=True)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/encode', methods=['POST'])
def encode_message():
    if 'image' not in request.files or 'message' not in request.form:
        return "Missing data", 400
    
    image = request.files['image']
    message = request.form['message']
    image_path = os.path.join(UPLOAD_FOLDER, image.filename)
    encoded_path = os.path.join(RESULT_FOLDER, "encoded_" + image.filename)
    
    image.save(image_path)
    img = cv2.imread(image_path)
    encoded_img = encode(img, message)
    cv2.imwrite(encoded_path, encoded_img)
    
    return render_template('index.html', encoded_image=encoded_path)

@app.route('/decode', methods=['POST'])
def decode_message():
    if 'image' not in request.files:
        return "Missing image", 400
    
    image = request.files['image']
    image_path = os.path.join(UPLOAD_FOLDER, image.filename)
    image.save(image_path)
    
    img = cv2.imread(image_path)
    decoded_message = decode_image(img)
    
    return render_template('index.html', decoded_message=decoded_message)

if __name__ == '__main__':
    app.run(debug=True)
