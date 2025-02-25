# # from flask import Flask, render_template, request, send_file
# # import cv2
# # import numpy as np
# # import os
# # from helper_functions import encode, decode_image
# # from PIL import Image

# # app = Flask(__name__)
# # UPLOAD_FOLDER = "static/uploads"
# # RESULT_FOLDER = "static/results"
# # os.makedirs(UPLOAD_FOLDER, exist_ok=True)
# # os.makedirs(RESULT_FOLDER, exist_ok=True)

# # @app.route('/')
# # def index():
# #     return render_template('index.html')


# # app = Flask(__name__)

# # UPLOAD_FOLDER = "static/uploads"
# # if not os.path.exists(UPLOAD_FOLDER):
# #     os.makedirs(UPLOAD_FOLDER)

# # @app.route("/upload", methods=["POST"])
# # def upload_image():
# #     file = request.files["file"]
# #     filepath = os.path.join(UPLOAD_FOLDER, file.filename)
    
# #     # 🔹 Save the file in binary mode to prevent corruption
# #     file.save(filepath)

# #     # 🔹 Ensure image is loaded in consistent format
# #     with open(filepath, "rb") as f:
# #         image = Image.open(f)
# #         image = image.convert("RGB")  # Standardize format

# #     return "Image uploaded successfully", 200


# # @app.route('/encode', methods=['POST'])
# # def encode_message():
# #     if 'image' not in request.files or 'message' not in request.form:
# #         return "Missing data", 400
    
# #     image = request.files['image']
# #     message = request.form['message']
# #     image_path = os.path.join(UPLOAD_FOLDER, image.filename)
# #     encoded_path = os.path.join(RESULT_FOLDER, "encoded_" + image.filename)
    
# #     image.save(image_path)
# #     img = cv2.imread(image_path)
# #     encoded_img = encode(img, message)
# #     cv2.imwrite(encoded_path, encoded_img)
    
# #     return render_template('index.html', encoded_image=encoded_path)

# # @app.route('/decode', methods=['POST'])
# # def decode_message():
# #     if 'image' not in request.files:
# #         return "Missing image", 400
    
# #     image = request.files['image']
# #     image_path = os.path.join(UPLOAD_FOLDER, image.filename)
# #     image.save(image_path)
    
# #     img = cv2.imread(image_path)
# #     decoded_message = decode_image(img)
    
# #     return render_template('index.html', decoded_message=decoded_message)

# # if __name__ == '__main__':
# #     app.run(debug=True)


# from flask import Flask, render_template, request, send_file
# import cv2
# import numpy as np
# import os
# from helper_functions import encode, decode_image
# from PIL import Image

# app = Flask(__name__)

# UPLOAD_FOLDER = "static/uploads"
# RESULT_FOLDER = "static/results"
# os.makedirs(UPLOAD_FOLDER, exist_ok=True)
# os.makedirs(RESULT_FOLDER, exist_ok=True)

# @app.route('/')
# def index():
#     return render_template('index.html')

# @app.route("/upload", methods=["POST"])
# def upload_image():
#     file = request.files["file"]
#     filepath = os.path.join(UPLOAD_FOLDER, file.filename)
    
#     # 🔹 Save the file in binary mode to prevent corruption
#     file.save(filepath)

#     # 🔹 Ensure image is loaded in consistent format
#     with open(filepath, "rb") as f:
#         image = Image.open(f)
#         image = image.convert("RGB")  # Standardize format

#     return "Image uploaded successfully", 200

# @app.route('/encode', methods=['POST'])
# def encode_message():
#     if 'image' not in request.files or 'message' not in request.form:
#         return "Missing data", 400
    
#     image = request.files['image']
#     message = request.form['message']
#     image_path = os.path.join(UPLOAD_FOLDER, image.filename)
#     encoded_path = os.path.join(RESULT_FOLDER, "encoded_" + image.filename)
    
#     image.save(image_path)
#     img = cv2.imread(image_path)
#     encoded_img = encode(img, message)
#     cv2.imwrite(encoded_path, encoded_img)
    
#     return render_template('index.html', encoded_image=encoded_path)

# @app.route('/decode', methods=['POST'])
# def decode_message():
#     if 'image' not in request.files:
#         return "Missing image", 400
    
#     image = request.files['image']
#     image_path = os.path.join(UPLOAD_FOLDER, image.filename)
#     image.save(image_path)
    
#     img = cv2.imread(image_path)
#     decoded_message = decode_image(img)
    
#     return render_template('index.html', decoded_message=decoded_message)

# if __name__ == '__main__':
#     app.run(debug=True)


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
    app.run(debug=False, host="0.0.0.0", port=10000)
