import cv2
from keras.optimizers import Adam
from keras.models import load_model
import numpy as np
import keras.backend as K
import matplotlib.pyplot as plt

def mae(y_true, y_pred):
    return K.abs(K.sum(y_true) - K.sum(y_pred))

def mse(y_true, y_pred):
    return (K.sum(y_true) - K.sum(y_pred)) * (K.sum(y_true) - K.sum(y_pred))

model_path = './model.h5'
model = load_model(model_path)
adam = Adam(learning_rate=0.00000001)
model.compile(loss='mse', optimizer=adam, metrics=[mae, mse])

# model.summary()

imgpath = './test.png'
img = cv2.cvtColor(cv2.imread(imgpath), cv2.COLOR_BGR2RGB).astype(np.float32)
img = img.astype(np.float32, copy=False)
img = img[:, :, 0]
ht = img.shape[0]
wd = img.shape[1]
ht_1 = int((ht / 4) * 4)
wd_1 = int((wd / 4) * 4)
img = cv2.resize(img, (wd_1, ht_1))
img = img.reshape((img.shape[0], img.shape[1], 1))

pred = np.squeeze(model.predict(np.expand_dims(img, axis=0)))

fg, (ax_x_ori, ax_pred) = plt.subplots(1, 2, figsize=(20, 4))
ax_x_ori.imshow(cv2.cvtColor(cv2.imread(imgpath), cv2.COLOR_BGR2RGB))
ax_x_ori.set_title('Original Image')
ax_pred.imshow(pred, cmap=plt.cm.jet)
ax_pred.set_title('Prediction: ' + str(np.sum(pred)))
plt.show()