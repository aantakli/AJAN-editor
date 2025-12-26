import requests
import json
from rdflib import Namespace


VEHICLE = Namespace("http://carla.org/vehicle/")
PEDESTRIAN = Namespace("http://carla.org/pedestrian/")
LOCATION = Namespace("http://carla.org/location/")
BASE = Namespace("http://carla.org/")

def json_to_turtle(data, bool = False):
    flag = False
    triples = ""
    if 'type' in data and 'vehicle' in data['type']:
        flag = True
        vehicle = f"<http://carla.org/vehicle/{data['id']}>"
        triples += f"{vehicle} rdf:type <{VEHICLE.Vehicle}> .\n"
        triples += f"{vehicle} <{VEHICLE.id}> \"{data['id']}\" .\n"
        triples += f"{vehicle} <{VEHICLE.type}> \"{data['type']}\" .\n"
        triples += f"{vehicle} <{VEHICLE.timestamp}> \"{data['timestamp']}\" .\n"
    elif 'type' in data and 'pedestrian' in data['type']:
        flag = True
        pedestrian = f"<http://carla.org/pedestrian/{data['id']}>"
        triples += f"{pedestrian} rdf:type <{PEDESTRIAN.Pedestrian}> .\n"
        triples += f"{pedestrian} <{PEDESTRIAN.id}> \"{data['id']}\" .\n"
        triples += f"{pedestrian} <{PEDESTRIAN.type}> \"{data['type']}\" .\n"
        triples += f"{pedestrian} <{PEDESTRIAN.timestamp}> \"{data['timestamp']}\" .\n"
    if flag == False:
        return ""
    if bool == True:
        triples += f"{vehicle} <{VEHICLE.atBusStation}> \"{True}\" .\n"

    location = f"<http://carla.org/location/{data['id']}>"
    triples += f"{location} <{LOCATION.x}> \"{data['location']['x']}\" .\n"
    triples += f"{location} <{LOCATION.y}> \"{data['location']['y']}\" .\n"
    triples += f"{location} <{LOCATION.z}> \"{data['location']['z']}\" .\n"

    if 'type' in data and 'vehicle' in data['type']:
        triples += f"{vehicle} <{VEHICLE.location}> {location} .\n"
    elif 'type' in data and 'pedestrian' in data['type']:
        triples += f"{pedestrian} <{PEDESTRIAN.location}> {location} .\n"

    return f"@prefix ajan: <http://www.ajan.de/ajan-ns#> .\n@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .\n@prefix carla: <http://carla.org/> .\n\n{triples}"


def send_data(data):
  url = 'http://localhost:8080/ajan/agents/Entity0505?capability=fetchData'
  observation = json_to_turtle(data)
  if observation == "":
    print("Data not valid")
    return
  print(observation)
  headers = {'Content-Type': 'application/trig'}
  response = requests.post(url, data=observation, headers=headers)

  if response.status_code == 200:
    print('POST > send_data successful')
  else:
    print('POST > send_data failed')
    print(response.text)
    print(response.status_code)

if __name__ == "__main__":
  # Example data to send
  data = {
    "id": "vehicle_123",
    "type": "vehicle",
    "timestamp": "2024-12-03T12:00:00Z",
    "location": {
        "x": 11111123121231211111,
        "y": 67.89,
        "z": 0.0
    }
  }

  send_data(data)
