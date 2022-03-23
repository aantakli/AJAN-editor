import logging
import os.path
import time
from urllib.parse import urljoin

import requests

BASE_URL = "http://localhost:8090/rdf4j/repositories/"


def create_repo(base_url:str, repo_name: str, statement_file_path: str):
    data = "@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#>." \
           "\r\n@prefix rep: <http://www.openrdf.org/config/repository#>." \
           "\r\n@prefix sr: <http://www.openrdf.org/config/repository/sail#>." \
           "\r\n@prefix sail: <http://www.openrdf.org/config/sail#>." \
           "\r\n@prefix ms: <http://www.openrdf.org/config/sail/memory#>." \
           "\r\n" \
           "\r\n[] a rep:Repository ;" \
           f"\r\n   rep:repositoryID \"{repo_name}\" ;" \
           f"\r\n   rdfs:label \"Created on {time.time()}\" ;" \
           "\r\n   rep:repositoryImpl [" \
           "\r\n      rep:repositoryType \"openrdf:SailRepository\" ;" \
           "\r\n      sr:sailImpl [" \
           "\r\n\t sail:sailType \"openrdf:NativeStore\" ;" \
           "\r\n\t ms:persist true ;" \
           "\r\n\t ms:syncDelay 120" \
           "\r\n      ]" \
           "\r\n   ]."
    url = f"{base_url}{repo_name}"
    params = {
      "type": "",
      "name": "application/trig",
      "data": data
    }
    headers = {"Content-Type": "application/trig"}
    requests.put(url, data=data, headers=headers)

    if statement_file_path is not None:
        data: str = open(statement_file_path, encoding="utf-8").read()
        url = url+"/statements"
        requests.put(url, headers=headers, data=data)
        logging.info(f"Adding statements to {repo_name}")


def start_editor():
    from subprocess import Popen
    Popen("startAll.bat")


if __name__ == "__main__":
    create_repo(BASE_URL,"editor_data", r"Triplestore Repos\editor_data.trig")
    create_repo(BASE_URL,"node_definitions", r"Triplestore Repos\node_definitions.ttl")
    start_editor()
