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
      style: 'https://www.onemap.gov.sg/maps/json/raster/mbstyle/Default.json',
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
