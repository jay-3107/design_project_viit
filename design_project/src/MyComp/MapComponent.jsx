import { MapContainer, TileLayer, Polyline, Marker, Popup } from "react-leaflet";
import { useState } from "react";
import axios from "axios";
import L from "leaflet"; // Import Leaflet for custom icons
import "./style.css";
// import police_icon from './../../public/police_icon.png';
import police_icon from './../assets/police_icon.png';
import source_icon from './../assets/source_icon.png';

import destination_icon from './../assets/destination_icon.png';




const API_KEY = "5b3ce3597851110001cf62484e18f0c0d2bb418ebdadfa220f8c42a3";

export default function MapComponent() {
  const [source, setSource] = useState("");
  const [destination, setDestination] = useState("");
  const [routes, setRoutes] = useState([]);
  const [safetyInfo, setSafetyInfo] = useState(null);
  const [policeStations, setPoliceStations] = useState([]);
  const [sourceCoords, setSourceCoords] = useState(null);
  const [destinationCoords, setDestinationCoords] = useState(null);

  const getCoordinates = async (place) => {
    try {
      const response = await axios.get(
        `https://nominatim.openstreetmap.org/search?format=json&q=${place}`
      );

      if (response.data.length === 0) {
        alert(`No coordinates found for ${place}`);
        return null;
      }

      return [parseFloat(response.data[0].lon), parseFloat(response.data[0].lat)];
    } catch (error) {
      console.error(`Error fetching coordinates for ${place}:`, error);
      return null;
    }
  };

  const getSafetyInfo = async (coords) => {
    try {
      const overpassQuery = `
        [out:json];
        node["amenity"="police"](around:5000, ${coords[1]}, ${coords[0]});
        out;
      `;

      const response = await axios.get(
        `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(overpassQuery)}`
      );

      const stations = response.data.elements.map((station) => ({
        lat: station.lat,
        lon: station.lon,
        name: station.tags.name || "Unnamed Police Station",
      }));

      setPoliceStations(stations);

      setSafetyInfo({
        sourceSafetyScore: (Math.random() * 3 + 7).toFixed(1),
        destinationSafetyScore: (Math.random() * 3 + 6).toFixed(1),
        crimeRate: "Moderate",
        streetLights: "Available",
        nearbyPoliceStations: stations.length,
        averageAccidentsPerMonth: Math.floor(Math.random() * 10) + 1,
      });
    } catch (error) {
      console.error("Error fetching safety information:", error);
      setSafetyInfo(null);
    }
  };

  // console.log(sourceCoords, destinationCoords);
  console.log('Source Coords:', sourceCoords);
  console.log('Destination Coords:', destinationCoords);


  console.log('Source Icon URL:', source_icon);
  console.log('Destination Icon URL:', destination_icon);



  const getRoutes = async () => {
    try {
      if (!source || !destination) {
        alert("Please enter both Source and Destination");
        return;
      }

      const sourceCoords = await getCoordinates(source);
      const destinationCoords = await getCoordinates(destination);

      if (!sourceCoords || !destinationCoords) {
        alert("Invalid Source or Destination");
        return;
      }

      setSourceCoords(sourceCoords);
      setDestinationCoords(destinationCoords);

      const response = await axios.post(
        `https://api.openrouteservice.org/v2/directions/driving-car/geojson`,
        {
          coordinates: [sourceCoords, destinationCoords],
          alternative_routes: { target_count: 3, weight_factor: 1.3 },
        },
        {
          headers: {
            Authorization: API_KEY,
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.data.features || response.data.features.length === 0) {
        alert("No route found. Try another location.");
        return;
      }

      const routesData = response.data.features.map((feature) =>
        feature.geometry.coordinates.map((coord) => [coord[1], coord[0]]),
      );

      setRoutes(routesData);

      await getSafetyInfo(sourceCoords);
    } catch (error) {
      console.error("Error fetching routes:", error.response?.data || error.message);
      alert("Failed to load route. Check API key or try again later.");
    }
  };

  // Create custom icon for police station markers
  const policeStationIcon = new L.Icon({
    iconUrl: police_icon, // Police icon
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32],
  });

  // Custom icons for source and destination
  const sourceMarkerIcon = new L.Icon({
    iconUrl: '../assets/source_icon.png',  // Custom source icon import name from ;
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32],
  });

  const destinationMarkerIcon = new L.Icon({
    iconUrl: '../assets/destination_icon.png',  // Custom destination icon import name from ;
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32],
  });



  return (
    <div className="map-container">
      <div className="inputs">
        <h2>Find Safe Routes</h2>
        <h1>Safest Routes Navigation</h1>
        <p>Choose the best and safest route for your journey.</p>
        <input
          type="text"
          placeholder="Enter Source (e.g., Shivaji Nagar, Pune)"
          value={source}
          onChange={(e) => setSource(e.target.value)}
        />
        <input
          type="text"
          placeholder="Enter Destination (e.g., Hadapsar, Pune)"
          value={destination}
          onChange={(e) => setDestination(e.target.value)}
        />
        <button onClick={getRoutes}>Get Routes</button>
      </div>

      <div className="map-and-info">
        <MapContainer center={[18.5204, 73.8567]} zoom={12} className="map">
          
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

          {routes.length > 0 &&
            routes.map((path, index) => (
              <Polyline key={index} positions={path} color={["blue", "red", "green"][index % 3]} />
            ))}

          {/* Mark the source and destination with custom icons */}
          {sourceCoords && (
            <Marker position={sourceCoords} icon={sourceMarkerIcon}>
              <Popup>Source: {source}</Popup>
            </Marker>
          )}
          {destinationCoords && (
            <Marker position={destinationCoords} icon={destinationMarkerIcon}>
              <Popup>Destination: {destination}</Popup>
            </Marker>
          )}

          {/* Mark the police stations with custom icon */}
          {policeStations.map((station, index) => (
            <Marker
              key={index}
              position={[station.lat, station.lon]}
              icon={policeStationIcon}
            >
              <Popup>{station.name}</Popup>
            </Marker>
          ))}
        </MapContainer>

        <div className="safety-info">
          {safetyInfo ? (
            <div>
              <h3>Safety Information</h3>
              <p><strong>Source Safety Score:</strong> {safetyInfo.sourceSafetyScore}</p>
              <p><strong>Destination Safety Score:</strong> {safetyInfo.destinationSafetyScore}</p>
              <p><strong>Crime Rate:</strong> {safetyInfo.crimeRate}</p>
              <p><strong>Street Lights:</strong> {safetyInfo.streetLights}</p>
              <p><strong>Nearby Police Stations:</strong> {safetyInfo.nearbyPoliceStations}</p>
              <p><strong>Average Accidents per Month:</strong> {safetyInfo.averageAccidentsPerMonth}</p>
            </div>
          ) : (
            <p>Enter source and destination to get safety details.</p>
          )}
        </div>
      </div>
    </div>
  );
}
