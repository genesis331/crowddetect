FROM python:3.10
RUN apt update && apt install -y python3-opencv
RUN apt install -y libgl1-mesa-dev
COPY requirementsdocker.txt /
RUN pip install -r requirementsdocker.txt

COPY . /app

EXPOSE 5000
ENV PORT 5000
WORKDIR /app

# CMD gunicorn --bind :$PORT backend:app
CMD ["python3", "backend.py"]