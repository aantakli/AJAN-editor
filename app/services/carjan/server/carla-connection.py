from flask import Flask, jsonify, request

app = Flask(__name__)

@app.route('/')
def hello():
    return jsonify({"message": "CARLA Flask API running"})

@app.route('/api/carla', methods=['POST'])
def handle_carla_scenario():
    scenario_data = request.json
    print("Received scenario data in Flask:", scenario_data)

    response_message = {
        "status": "success",
        "message": "CARLA scenario processed in Flask"
    }
    return jsonify(response_message)

if __name__ == '__main__':
    app.run(host='127.0.0.1', port=5000)
