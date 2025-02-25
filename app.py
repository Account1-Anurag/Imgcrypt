from flask import Flask, render_template, request, send_file
import cv2
import numpy as np
from io import BytesIO
from PIL import Image
from helper_functions import encode, decode_image

app = Flask(__name__)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/encode', methods=['POST'])
def encode_message():
    if 'image' not in request.files or 'message' not in request.form:
        return "Missing data", 400

    image = request.files['image']
    message = request.form['message']

    # Read image into memory
    image_bytes = BytesIO(image.read())
    image_pil = Image.open(image_bytes).convert("RGB")

    # Convert PIL image to OpenCV format
    img = np.array(image_pil)
    img = cv2.cvtColor(img, cv2.COLOR_RGB2BGR)

    # Encode message
    encoded_img = encode(img, message)

    # Convert OpenCV image back to bytes
    _, encoded_buffer = cv2.imencode(".png", encoded_img)
    encoded_io = BytesIO(encoded_buffer)

    return send_file(encoded_io, mimetype='image/png', as_attachment=True, download_name="encoded.png")

@app.route('/decode', methods=['POST'])
def decode_message():
    if 'image' not in request.files:
        return "Missing image", 400

    image = request.files['image']

    # Read image into memory
    image_bytes = BytesIO(image.read())
    image_pil = Image.open(image_bytes).convert("RGB")

    # Convert PIL image to OpenCV format
    img = np.array(image_pil)
    img = cv2.cvtColor(img, cv2.COLOR_RGB2BGR)

    # Decode message
    decoded_message = decode_image(img)

    return render_template('index.html', decoded_message=decoded_message)

# if __name__ == '__main__':
#     app.run(debug=True)
if __name__ == '__main__':
    # app.run(debug=True)
    app.run(debug=False, host="0.0.0.0", port=10000)