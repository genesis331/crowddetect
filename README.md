# CrowdControl

CrowdControl is a crowd number estimation tool based on machine learning through a multi-column convolutional neural network (MCNN) model. It consists of a server and a client. 

## Features
- Monitor passenger numbers using cameras
- Provide real-time crowd estimation 
- Alert station managers and the public of potential overcrowding issues

## Demo
Click [here](https://crowddetect-b0621.web.app/) to see a demo of the client without installing anything. 

## Future Work
- Refining ML algorithms and collecting more data to enhance accuracy and efficiency
- Incorporating historical data into prediction algorithms for forecasting potential crowd levels
- Adding a real-time vehicle tracker and public transport schedule to enable commuters to plan their travel routes
- Exploring the use of sensors and Wi-Fi tracking for crowd counting
- Collaborating with transportation authorities to integrate the solution with existing public transportation infrastructure
- Extending the solution to other domains such as retail stores, museums, and events.

## Installation (Server)
### Prerequisites
1. Docker
### Steps
1. Clone the repository
```
git clone https://github.com/genesis331/crowddetect.git
```
2. Build the Docker image
```
docker build -t crowddetect .
```
3. Run the Docker image
```
docker run -p 5000:5000 --env-file=.env crowddetect 
```

## Installation (Client)
### Prerequisites
1. NodeJS + NPM
### Steps
1. Clone the repository
```
git clone https://github.com/genesis331/crowddetect.git
```
2. Install the dependencies
```
npm install
```
3. Run the client
```
npm run dev
```

## Project Members (alphabetical order)
- Cheah Zixu
- H’ng Cherng Khai
- Lim Hui Ern
- Lim Jun Yi
- Vanessa Jing Taing