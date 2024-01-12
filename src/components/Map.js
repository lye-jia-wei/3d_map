import React from 'react';
import ReactDOM from 'react-dom';
import { connect } from 'react-redux';
import mapboxgl from 'mapbox-gl';
import store from '../store';
import {
  addUserPoint,
  toggleSatelliteOverlay,
} from '../actions';
import LayerManager from '../map-utils/layer-manager';
import Marker from './Marker';
import SatelliteOverlayToggle from './SatelliteOverlayToggle';
import './Map.css';
import './PopupContent.css';

mapboxgl.accessToken = 'pk.eyJ1IjoicGFuYmFsYW5nYSIsImEiOiJjam55MXU0aWMxNzN5M3Byd2NmYzR3Y24wIn0.0HbKIGeEpiDqh4ezOQOw-Q';

class Map extends React.Component {
  constructor(props) {
    super(props);
    this._map = undefined;
    this._popup = new mapboxgl.Popup({ offset: 25 }); // Create a popup instance
    this.state = {
      apiData: null,
    };
  }

  componentDidMount() {
    const map = new mapboxgl.Map({
      container: this.mapContainer,
      style: 'mapbox://styles/mapbox/dark-v10',
      //style: 'https://www.onemap.gov.sg/maps/json/raster/mbstyle/Night.json',
      center: [103.91721586504343, 1.4060810835492106],
      zoom: 16,
      pitch: 60,
      bearing: -20,
      antialias: true,
    });

    this._map = map;

    map.on('load', () => {
      this.mapDidLoad();
    });

    map.on('click', this.handleMapClick.bind(this));
  }

  async fetchApiData() {
    try {
      const apiUrl = 'https://arrivelah2.busrouter.sg/?id=65569'; // Replace with your actual API endpoint
  
      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
        redirect: 'follow',
      });
  
      const data = await response.json();
      
      // Log the fetched data to the console
      console.log('Fetched data:', data);
  
      return data;
    } catch (error) {
      console.error('Error fetching API data', error);
      throw error;
    }
  }

  async updatePopupContent() {
    try {
      const apiData = await this.fetchApiData();
  
      // Extracting relevant information
      const { services } = apiData;
      const firstService = services[0];
  
      // Check if the services array is not empty
      if (firstService) {
        const { no, next, subsequent, next2 } = firstService;
  
        // Log the values to the console
        console.log('Bus No:', no);
        console.log('Next Bus:', next);
        console.log('Following Bus', subsequent);
        console.log('Next2 Arrival:', next2);
  
        // Format the time strings (you can use a library like moment.js for better formatting)
        const nextArrivalTime = new Date(next.time).toLocaleTimeString('en-US', { hour: 'numeric', minute: 'numeric' });
        const subsequentArrivalTime = new Date(subsequent.time).toLocaleTimeString('en-US', { hour: 'numeric', minute: 'numeric' });
        const next2ArrivalTime = new Date(next2.time).toLocaleTimeString('en-US', { hour: 'numeric', minute: 'numeric' });
  
        // Update the popup content with specific information
        const popupContent = `
        <section className="weather">
        <h1>Bus Stop Information | Blk 654D (Punggol East)</h1>
        <section>
        </section>

        <section>
        <p className="help-text">
        <p><strong>Bus No:</strong> ${no}</p>
        <p><strong>Next Bus:</strong> ${nextArrivalTime}</p>
        <p><strong>Following Bus:</strong> ${subsequentArrivalTime}</p>
      </p>
      </section>


      `;
  
        // Set the updated content to the popup
        this._popup.setHTML(popupContent);
        // Use the coordinates of a specific point or marker to open the popup
        const lngLat = [103.919207, 1.398591]; // Specify the longitude and latitude
        this._popup.setLngLat(lngLat).addTo(this._map);
      }
    } catch (error) {
      // Handle errors
      console.error('Error updating popup content', error);
    }
  }

  mapDidLoad() {
    const map = this._map;

    const layerManager = new LayerManager(map);
    map.addSource('onemap', {
      type: 'vector',
      tiles: ['https://www.onemap.gov.sg/maps/json/raster/mbstyle/Default.json'],
      minzoom: 0,
      maxzoom: 18,
    });


    map.addSource('traffic', {
      type: 'vector',
      url: 'mapbox://mapbox.mapbox-traffic-v1',
    });


    
    // Add traffic layer
    map.addLayer({
      id: 'traffic-layer-severe',
      type: 'line',
      source: 'traffic',
      'source-layer': 'traffic',
      filter: ['==', ['get', 'congestion'], 'severe'], // Severe congestion filter
      layout: {
        'line-join': 'round',
        'line-cap': 'round',
      },
      paint: {
        'line-color': 'red',
        'line-opacity': 0.8,
        'line-width': 6,
      },
      visibility: 'visible', // Set to 'visible' to initially show the layer
    });
    
    // Add layer for heavy congestion (yellow lines)
    map.addLayer({
      id: 'traffic-layer-heavy',
      type: 'line',
      source: 'traffic',
      'source-layer': 'traffic',
      filter: ['==', ['get', 'congestion'], 'heavy'], // Heavy congestion filter
      layout: {
        'line-join': 'round',
        'line-cap': 'round',
      },
      paint: {
        'line-color': 'yellow',
        'line-opacity': 0.8,
        'line-width': 6,
      },
      visibility: 'visible', // Set to 'visible' to initially show the layer
    });
    
    // Add layer for moderate congestion (orange lines)
    map.addLayer({
      id: 'traffic-layer-moderate',
      type: 'line',
      source: 'traffic',
      'source-layer': 'traffic',
      filter: ['==', ['get', 'congestion'], 'moderate'], // Moderate congestion filter
      layout: {
        'line-join': 'round',
        'line-cap': 'round',
      },
      paint: {
        'line-color': 'orange',
        'line-opacity': 0.8,
        'line-width': 6,
      },
      visibility: 'visible', // Set to 'visible' to initially show the layer
    });
    
    // Add layer for low congestion (green lines)
    map.addLayer({
      id: 'traffic-layer-low',
      type: 'line',
      source: 'traffic',
      'source-layer': 'traffic',
      filter: ['==', ['get', 'congestion'], 'low'], // Low congestion filter
      layout: {
        'line-join': 'round',
        'line-cap': 'round',
      },
      paint: {
        'line-color': 'green',
        'line-opacity': 0.8,
        'line-width': 6,
      },
      visibility: 'visible', // Set to 'visible' to initially show the layer
    });


    const popupContent2 = `
    <section className="weather">
    <h1>EOT Facilities (CC1)</h1>

    <section>
    
    </section>

    <section>
    <img src="https://i.ibb.co/cJHfpvg/eot.png" alt="Image Description">
    <p style="font-size: 14px; text-align: justify;  color: #888;">EOT Facilities provide a safe bicycle locker to store your bicycle, equipped with shower amenities</p>
    <p style="font-size: 14px;><strong>Bicycle Locker Availabity</strong> 4 Lockers</p>
    <p style="font-size: 14px;><strong>Bicycle Locker Availability:</strong> 2 Lockers</p>


  </section>


  `;

    const popup = new mapboxgl.Popup({ offset: 25 })
    .setLngLat([103.92179241561968, 1.4006758793912013])
    .setHTML(popupContent2)
    .addTo(map);

    const trafficToggleBtn = document.createElement('button');
    trafficToggleBtn.textContent = 'Toggle Traffic Layer';
    trafficToggleBtn.addEventListener('click', () => this.toggleTrafficLayer());
    map.getContainer().appendChild(trafficToggleBtn);

    map.style.stylesheet.layers.forEach((layer) => {
      if (layer.type === 'symbol') {
        map.removeLayer(layer.id);
      }
    });

    const aonCenterLayer = layerManager.getCustomObjLayer({
      id: 'aon-center',
      filePath: process.env.PUBLIC_URL + '/aon-center.obj',
      origin: [103.91721586504343, 1.4060810835492106],
      scale: 0.537,
    });
    map.addLayer(aonCenterLayer);

    const aonCenterLayer2 = layerManager.getCustomObjLayer({
      id: 'aon-center2',
      filePath: process.env.PUBLIC_URL + '/parking-lot.obj',
      origin: [103.92172627383897, 1.4008661898365082],
      scale: 0.937,
    });
    map.addLayer(aonCenterLayer2);
    const originalRectangleCoordinates = [
      [103.9215, 1.4008],
      [103.9215, 1.4012],
      [103.922, 1.4012],
      [103.922, 1.4008],
      [103.9215, 1.4008],
    ];
    
    // Calculate the smaller rectangle coordinates by reducing each dimension by 60%
    const reductionPercentage = 0.21;
    const smallerRectangleCoordinates = originalRectangleCoordinates.map(([lng, lat], index) => {
      const center = [103.92175, 1.401];
    
      // Calculate the new coordinates based on the reduction factor
      const newLng = center[0] + (lng - center[0]) * reductionPercentage;
      const newLat = center[1] + (lat - center[1]) * reductionPercentage;
    
      return [newLng, newLat];
    });
    
    // Add the smaller green rectangle to the map
    map.addLayer({
      id: 'smaller-green-rectangle',
      type: 'fill',
      source: {
        type: 'geojson',
        data: {
          type: 'Feature',
          geometry: {
            type: 'Polygon',
            coordinates: [smallerRectangleCoordinates],
          },
        },
      },
      paint: {
        'fill-color': 'green',
        'fill-opacity': 0.5,
      },
    });
    const mapboxBuildingsLayer = layerManager.getMapboxBuildingsLayer();
    map.addLayer(mapboxBuildingsLayer);
    map.addLayer({
      id: 'onemap-layer',
      type: 'fill',
      source: 'onemap',
      layout: {},
      paint: {
        'fill-color': 'rgba(255, 0, 0, 0.5)',
      },
    });

    map.addControl(new mapboxgl.NavigationControl());

    

    this.updatePopupContent();

    ReactDOM.render(
      <SatelliteOverlayToggle
        didMount={this.satelliteOverlayToggleDidMount.bind(this)}
        handleClick={this.didToggleSatelliteOverlay.bind(this)}
        store={store}
      />,
      document.getElementById('satellite-overlay-toggle')
    )

    map.addSource(
      'satellite',
      {
        type: 'raster',
        url: 'mapbox://mapbox.satellite',
      }
    );
  }


  toggleTrafficLayer() {
    const map = this._map;
    const visibility = map.getLayoutProperty('traffic-layer', 'visibility');

    // Toggle the visibility of the traffic layer
    map.setLayoutProperty('traffic-layer', 'visibility', visibility === 'visible' ? 'none' : 'visible');
  }
  satelliteOverlayToggleDidMount(comp) {
    this._map.addControl(comp);
  }

  render() {
    return (
      <div ref={el => (this.mapContainer = el)} className="mapContainer">
        {this.getUserPoints().map((userPoint) => (
          <Marker userPointId={userPoint.id} key={userPoint.id} map={this} />
        ))}
      </div>
    );
  }

  getUserPoints() {
    return Object.values(this.props.userPoints);
  }

  didToggleSatelliteOverlay() {
    this.props.dispatch(toggleSatelliteOverlay());
  }

  handleMapClick(e) {
    const isMarkerClick = e.originalEvent.target.classList.contains('marker');
    if (isMarkerClick) return;

    const { lng, lat } = e.lngLat;
    const lngLat = { lng, lat };

    this.props.dispatch(addUserPoint(lngLat));
  }
}

const mapStateToProps = (state) => ({
  userPoints: state.userPoints,
  shouldShowSatelliteOverlay: state.shouldShowSatelliteOverlay,
});

export default connect(mapStateToProps)(Map);
