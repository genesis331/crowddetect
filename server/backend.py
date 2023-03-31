import os
import io
import base64
from dotenv import load_dotenv
from PIL import Image
from firebase_admin import credentials, initialize_app, storage, firestore
from flask import Flask, request
from flask_cors import CORS, cross_origin
from datetime import datetime as dt
from keras.models import load_model
from keras.optimizers import Adam
import keras.backend as K
import numpy as np
import cv2
import matplotlib
import matplotlib.pyplot as plt
matplotlib.use('Agg')
load_dotenv()

# Metrics Functions
def mae(y_true, y_pred):
    return K.abs(K.sum(y_true) - K.sum(y_pred))

def mse(y_true, y_pred):
    return (K.sum(y_true) - K.sum(y_pred)) * (K.sum(y_true) - K.sum(y_pred))

# Load Model
model = load_model('./model.h5')
adam = Adam(learning_rate=0.00000001)
model.compile(loss='mse', optimizer=adam, metrics=[mae, mse])

# Initiate Firebase and Firestore
credObj = {
  "type": "service_account",
  "project_id": "crowddetect-b0621",
  "private_key_id": os.getenv("PRIVATE_KEY_ID"),
  "private_key": os.getenv("PRIVATE_KEY").replace(r'\n', '\n'),
  "client_email": "firebase-adminsdk-8iywf@crowddetect-b0621.iam.gserviceaccount.com",
  "client_id": os.getenv("CLIENT_ID"),
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-8iywf%40crowddetect-b0621.iam.gserviceaccount.com"
}

# cred = credentials.Certificate('./credentials.json')
cred = credentials.Certificate(credObj)
initialize_app(cred, {'storageBucket': 'crowddetect-b0621.appspot.com'})
db = firestore.client()

# Initiate Flask App
app = Flask(__name__)
CORS(app)
app.config['CORS_HEADERS'] = 'Content-Type'

# Home
@app.route('/')
@cross_origin()
def home():
    return 'Crowd Detect Project'

# Predict
@app.route('/predict', methods=['GET', 'POST'])
@cross_origin()
def predict(): 

    # Receive Image
    station_name = request.form.get('station_id')
    platform_number = request.form.get('platform_number')
    ori_img = request.form.get('platform_image')

    # Convert ori_img from base64 to image
    ori_img = base64.b64decode(ori_img)
    ori_img = Image.open(io.BytesIO(ori_img))
    ori_img = ori_img.convert('RGB')

    # Save in temp directory
    imgpath = 'temp/' + 'temp.png'
    ori_img.save(imgpath)
    ori_img = cv2.imread(imgpath)

    # Preprocess Image
    edited_img = cv2.cvtColor(ori_img, cv2.COLOR_BGR2RGB).astype(np.float32)
    edited_img = edited_img.astype(np.float32, copy=False)
    edited_img = edited_img[:, :, 0]
    ht = edited_img.shape[0]
    wd = edited_img.shape[1]
    ht_1 = int((ht / 4) * 4)
    wd_1 = int((wd / 4) * 4)
    edited_img = cv2.resize(edited_img, (wd_1, ht_1))
    edited_img = edited_img.reshape((edited_img.shape[0], edited_img.shape[1], 1))

    # Prediction
    prediction = np.squeeze(model.predict(np.expand_dims(edited_img, axis=0)))
    count = np.sum(prediction)

    # Generate Figure
    fig, (ax_ori, ax_pred) = plt.subplots(1, 2, figsize=(20, 4))
    ax_ori.imshow(cv2.cvtColor(ori_img, cv2.COLOR_BGR2RGB))
    ax_ori.set_title('Original Image')
    ax_pred.imshow(prediction, cmap=plt.cm.jet)
    ax_pred.set_title('Prediction: ' + str(count))
    
    # Retrieve Data from Firestore
    doc_ref = db.collection('stations').document(f'{station_name}').collection('platforms').document(f'platform{platform_number}')
    result = doc_ref.get().to_dict()

    if len(result['pred_num']) >= 10:
        del result['pred_num'][0]
        del result['pred_ts'][0]

    result['pred_num'].append(int(count))
    result['pred_ts'].append(dt.now())

    # Post to Firestore
    doc_ref.set(result)
    
    # Save File
    file_name = 'dmap.jpg'
    fig.savefig(file_name)

    # Post to Firebase
    bucket = storage.bucket()
    blob = bucket.blob(f'{station_name}/platform{platform_number}/prediction/{file_name}')
    blob.upload_from_filename(file_name)
    
    # Delete File Locally
    os.remove(file_name)

    return ('Success', 200)

# Run Flask App
if __name__ == '__main__':
    app.run(host="0.0.0.0", port=5000, debug=True)
