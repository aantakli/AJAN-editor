import requests
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

import requests

def generate_actor(name, behaviors):
    """
    Generates an AJAN actor with multiple behaviors.

    :param name: Name of the actor.
    :param agent_template: URI of the agent template.
    :param behaviors: List of behavior URIs.
    :return: Dictionary with the status and message of the operation.
    """
    agent_template = "http://localhost:8090/rdf4j/repositories/agents#AG_HelloWorld_BT_30275863-0113-4c7c-9ed9-b0502c643fa6"
    url = 'http://localhost:8080/ajan/agents/'

    # Dynamisch die Behaviors als RDF-Liste hinzufügen
    behaviors_rdf = " ,\n        ".join(f"<{behavior}>" for behavior in behaviors)

    # RDF-Daten generieren
    data = f'''@prefix ajan: <http://www.ajan.de/ajan-ns#> .
    @prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .
    @prefix xsd: <http://www.w3.org/2001/XMLSchema#> .
    @prefix carla: <http://www.carla.org#> .
    @prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .

    _:initAgent rdf:type ajan:AgentInitialisation ;
        ajan:agentId "{name}" ;
        rdfs:label "{name}"^^xsd:string ;
        ajan:agentTemplate <{agent_template}> ;
        ajan:agentInitKnowledge [
            ajan:agentReportURI "http://localhost:4202/report"^^xsd:anyURI ;
            ajan:agentId "{name}" ;
        ] ;
        ajan:behavior {behaviors_rdf} .'''

    # Header für die Anfrage
    headers = {'Content-Type': 'application/trig'}

    try:
        # POST-Anfrage senden
        response = requests.post(url, data=data, headers=headers)
        response.raise_for_status()  # Fehler werfen, falls der Statuscode kein 2xx ist

        # Erfolgsprüfung
        if response.status_code == 200:
            return {"status": "success", "message": f"Actor {name} generated successfully"}
        else:
            print(f'Generate AJAN Actor for {name} failed')
            print(response.text)
            return {"status": "failed", "message": response.text}
    except requests.exceptions.RequestException as e:
        print(f'Error generating actor {name}: {e}')
        print("Response text:", response.text)
        return {"status": "error", "message": str(e)}

# Deletes the agent
def destroy_actor(eid):
    url = 'http://localhost:8080/ajan/agents/'
    url += eid
    response = requests.delete(url)

    if response.status_code == 200:
        print('DELETE request successful')
    else:
        print('DELETE request failed')
        print(response.text)
        print(response.status_code)

def send_data(data):
    url = 'http://localhost:8080/ajan/agents/Carla?capability=ICTS-Endpoint'
    observation = json_to_turtle(data)
    if observation == "":
        print("Data not valid")
        return
    headers = {'Content-Type': 'application/trig'}
    response = requests.post(url, data=observation, headers=headers)

    if response.status_code == 200:
        print('POST > send_data successful')
    else:
        print('POST > send_data failed')
        print(response.text)
        print(response.status_code)

def send_atBusStation(id):
    print("bus at station")
    url = 'http://localhost:8080/ajan/agents/Carla?capability=ICTS-Endpoint'
    observation = json_to_turtle([], True)
    if observation == "":
        print("Data not valid")
        return
    headers = {'Content-Type': 'application/trig'}
    response = requests.post(url, data=observation, headers=headers)

    if response.status_code == 200:
        print('POST > send_atBusStation successful')
    else:
        print('POST > send_atBusStation failed')

def send_reachedBusStation():
    print("Pedestrian at station")
    url = 'http://localhost:8080/ajan/agents/Carla?capability=ICTS-Endpoint'
    data = '''@prefix carla: <http://www.carla.org/> .
    carla:Pedestrian carla:atBusStop carla:True .'''

    headers = {'Content-Type': 'application/trig'}
    response = requests.post(url, data=data, headers=headers)

    if response.status_code == 200:
        print('POST > send_reachedBusStation successful')
    else:
        print('POST > send_reachedBusStation failed')

def ping():
    url = 'http://localhost:8080/ajan/agents/Carla?capability=DataTransfer'
    response = requests.get(url)
    if response.status_code == 200:
        print('GET > ping successful')
    else:
        print('GET > ping failed')
        print(response.text)
        print(response.status_code)

def send_initialKnowledge(pedestrian, vehicle):
    print("Sending initial knowledge")
    url = 'http://localhost:8080/ajan/agents/Carla?capability=DataTransfer'
    # get the location of the pedestrian and the vehicle
    pedestrian_location = pedestrian.get_location()
    vehicle_location = vehicle.get_location()
    # get the id of the pedestrian and the vehicle
    pedestrian_id = pedestrian.id
    vehicle_id = vehicle.id
    # send the initial knowledge
    data = f'''@prefix carla: <http://carla.org/> .
    carla:Pedestrian carla:id {pedestrian_id} .
    carla:Vehicle carla:id {vehicle_id} .
    carla:{pedestrian_id} carla:x "{pedestrian_location.x}" .
    carla:{pedestrian_id} carla:y "{pedestrian_location.y}" .
    carla:{pedestrian_id} carla:z "{pedestrian_location.z}" .
    carla:{vehicle_id} carla:x "{vehicle_location.x}" .
    carla:{vehicle_id} carla:y "{vehicle_location.y}" .
    carla:{vehicle_id} carla:z "{vehicle_location.z}" .'''

    headers = {'Content-Type': 'application/trig'}
    response = requests.post(url, data=data, headers=headers)

    if response.status_code == 200:
        print('POST > send_initialKnowledge successful')
    else:
        print('POST > send_initialKnowledge failed')
        print(response.text)
        print(response.status_code)

if __name__ == "__main__":
    name = "ExampleAgent"
    agent_template = "http://localhost:8090/rdf4j/repositories/agents#AG_HelloWorld_BT_30275863-0113-4c7c-9ed9-b0502c643fa6"
    behaviors = [
        "http://localhost:8090/rdf4j/repositories/behaviors#BT_db30496f-474d-411c-a202-287b6e92610a",
        "http://localhost:8090/rdf4j/repositories/behaviors#BT_a719c6d6-57a5-4abd-86d3-03366ff4c8db"
    ]

    result = generate_actor(name, agent_template, behaviors)
    print(result)



