import carla

def get_vehicle_models():
    # Angenommen, du hast bereits eine CARLA-Weltinstanz (world)
    world = carla.Client('localhost', 2000).get_world()  # Falls du noch keine Verbindung zur CARLA-Welt hast

    # Lade die Blueprint-Bibliothek
    blueprints = [bp for bp in world.get_blueprint_library().filter('vehicle.*')]  # Filtere nur Fahrzeuge

    # Iteriere über alle Fahrzeug-Blueprints und gib die entsprechenden Informationen aus
    for blueprint in blueprints:
        print(f"Blueprint ID: {blueprint.id}")


if __name__ == "__main__":
    get_vehicle_models()
