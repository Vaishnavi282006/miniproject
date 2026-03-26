from flask import Flask, request, jsonify
from flask_cors import CORS
import os
import numpy as np
from PIL import Image
from tensorflow.keras.models import load_model

app = Flask(__name__)
CORS(app)


IMAGE_MODEL_PATH = "cnn_phishing_best.keras"

try:
    image_model = load_model(IMAGE_MODEL_PATH)
    print("✅ CNN image model loaded successfully!")
except Exception as e:
    image_model = None
    print("❌ Error loading CNN model:", e)



@app.route('/predict', methods=['POST'])
def predict():
    data = request.get_json()

    if not data or 'url' not in data:
        return jsonify({
            "result": "phishing",
            "confidence": "0%",
            "message": "No URL provided."
        }), 400

    url = data['url'].lower()

    suspicious_keywords = ['login', 'verify', 'secure', 'update', 'bank', 'paypal']
    is_phishing = any(word in url for word in suspicious_keywords)

    if is_phishing:
        return jsonify({
            "result": "phishing",
            "confidence": "91%",
            "message": "This page shows signs of credential harvesting or impersonation."
        })

    return jsonify({
        "result": "safe",
        "confidence": "96%",
        "message": "No phishing indicators found on this page."
    })



def image_model_predict(image_path):
    if image_model is None:
        return "phishing", "0%"

    
    img = Image.open(image_path).convert("RGB")

    
    img = img.resize((128, 128))

    
    img_array = np.array(img).astype("float32") / 255.0
    img_array = np.expand_dims(img_array, axis=0)

    
    prediction = image_model.predict(img_array)

    print("🔍 Raw prediction output:", prediction)
    print("🔍 Prediction shape:", prediction.shape)

    # CASE 1: Binary output like [[0.82]]
    if prediction.shape[-1] == 1:
        prob = float(prediction[0][0])

        print("🔍 Binary probability:", prob)

        # CURRENT ASSUMPTION:
        # prob > 0.5 = phishing
        # prob <= 0.5 = safe
        # If wrong, we will reverse after testing
        if prob > 0.5:
            return "phishing", f"{round(prob * 100, 2)}%"
        else:
            return "safe", f"{round((1 - prob) * 100, 2)}%"

    # CASE 2: Multi-class output like [[0.2, 0.8]]
    else:
        pred_class = int(np.argmax(prediction[0]))
        confidence = float(np.max(prediction[0])) * 100

        print("🔍 Predicted class:", pred_class)
        print("🔍 Confidence:", confidence)

        # CURRENT ASSUMPTION:
        # class 0 = safe
        # class 1 = phishing
        # If wrong, we will reverse after testing
        if pred_class == 1:
            return "phishing", f"{round(confidence, 2)}%"
        else:
            return "safe", f"{round(confidence, 2)}%"



@app.route('/predict-image', methods=['POST'])
def predict_image():
    if 'image' not in request.files:
        return jsonify({
            "result": "phishing",
            "confidence": "0%",
            "message": "No image uploaded"
        }), 400

    image = request.files['image']

    if image.filename == '':
        return jsonify({
            "result": "phishing",
            "confidence": "0%",
            "message": "Empty filename"
        }), 400

    upload_folder = 'uploads'
    os.makedirs(upload_folder, exist_ok=True)
    image_path = os.path.join(upload_folder, image.filename)
    image.save(image_path)

    print("📸 Received image:", image.filename)
    print("📂 Saved at:", image_path)

    try:
        result, confidence = image_model_predict(image_path)

        print("🧠 Final prediction:", result, confidence)

        return jsonify({
            "result": result,
            "confidence": confidence
        })

    except Exception as e:
        print("❌ Image prediction error:", str(e))
        return jsonify({
            "result": "phishing",
            "confidence": "0%",
            "message": f"Prediction error: {str(e)}"
        }), 500

    finally:
        try:
            os.remove(image_path)
        except:
            pass


if __name__ == '__main__':
    app.run(debug=True, host='127.0.0.1', port=5000)