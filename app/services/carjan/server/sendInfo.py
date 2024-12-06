import requests
from rdflib import Namespace

# Define namespaces
BASE = Namespace("http://carla.org/")
AJAN = Namespace("http://www.ajan.de/ajan-ns#")
RDF = Namespace("http://www.w3.org/1999/02/22-rdf-syntax-ns#")


def send_information(agent_name, subject, predicate, obj):
    """
    Sends an RDF triple as information to a specific agent.

    :param agent_name: Name of the AJAN agent.
    :param subject: RDF subject (full URI as string).
    :param predicate: RDF predicate (full URI as string).
    :param obj: RDF object (can be a URI or a literal).
    :return: None
    """
    # Endpoint for the specific agent
    url = f'http://localhost:8080/ajan/agents/{agent_name}?capability=fetchData'

    # Construct the RDF data as TriG format
    if obj.startswith("http://"):
        # If the object is a URI
        obj_value = f"<{obj}>"
    else:
        # If the object is a literal
        obj_value = f'"{obj}"'

    rdf_data = f'''
    @prefix ajan: <{AJAN}> .
    @prefix rdf: <{RDF}> .
    @prefix base: <{BASE}> .

    <{subject}> <{predicate}> {obj_value} .
    '''

    # Headers for the request
    headers = {'Content-Type': 'application/trig'}

    try:
        # Send the POST request
        response = requests.post(url, data=rdf_data, headers=headers)

        # Check the response
        if response.status_code == 200:
            print(f"Information sent successfully to agent {agent_name}")
        else:
            print(f"Failed to send information to agent {agent_name}")
            print(response.text)
    except requests.exceptions.RequestException as e:
        print(f"Error sending information to agent {agent_name}: {e}")


if __name__ == "__main__":
    # Example usage
    agent_name = "Entity0505"
    subject = "http://carla.org/vehicle/vehicle_123"
    predicate = "http://carla.org/vehicle/inDecisionBox"
    obj = "true"  # This can also be a URI like "http://example.org/true"

    send_information(agent_name, subject, predicate, obj)
