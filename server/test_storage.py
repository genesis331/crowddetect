import os
from datetime import datetime as dt
from firebase_admin import credentials, initialize_app, storage, firestore

# Initiate Firebase and Firestore
cred = credentials.Certificate('./credentials.json')
initialize_app(cred, {'storageBucket': 'crowddetect-b0621.appspot.com'})
db = firestore.client()

# Test Variables
station_name = 'kj13'
platform_number = '2'
count = 120
file_name = 'dm.png'

# Retrieve Data from Firestore
doc_ref = db.collection('stations').document(f'{station_name}').collection('platforms').document(f'platform{platform_number}')
result = doc_ref.get().to_dict()

if len(result['pred_num']) >= 10:
    del result['pred_num'][0]
    del result['pred_ts'][0]

result['pred_num'].append(count)
result['pred_ts'].append(dt.now())

# Post to Firestore
doc_ref.set(result)

# # Post to Firebase
# bucket = storage.bucket()
# blob = bucket.blob(f'{station_name}/platform{platform_number}/prediction/{file_name}')
# blob.upload_from_filename(file_name)

# # Delete File Locally
# os.remove(file_name)