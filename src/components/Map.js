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

mapboxgl.accessToken = 'pk.eyJ1IjoicGFuYmFsYW5nYSIsImEiOiJjam55MXU0aWMxNzN5M3Byd2NmYzR3Y24wIn0.0HbKIGeEpiDqh4ezOQOw-Q';

class Map extends React.Component {
  constructor(props) {
    super(props);
    this._map = undefined;
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
      this.updatePopupContent(); // Automatically update the popup content on map load
    });

    map.on('click', this.handleMapClick.bind(this));
  }

  async fetchApiData() {
    try {
      const apiUrl = 'http://datamall2.mytransport.sg/ltaodataservice/BusArrivalv2?BusStopCode=83139'; // Replace with your actual API endpoint
      const apiKey = '3pOFoHepSZWLinomZvIzaw=='; // Replace with your actual API key
      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'AccountKey': apiKey,
          'Accept': 'application/json',
        },
        redirect: 'follow',
      });
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching API data', error);
      throw error;
    }
  }

  async updatePopupContent() {
    try {
      const apiData = await this.fetchApiData();
      this.setState({ apiData });
    } catch (error) {
      // Handle errors
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

    const marker1 = new mapboxgl.Marker()
      .setLngLat([103.91876322712682, 1.4043535344988385])
      .addTo(map);

    const popup = new mapboxgl.Popup({ offset: 25 })
      .setHTML(`<p>Loading...</p>`);

    marker1.setPopup(popup);
    marker1.togglePopup();

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
    const { apiData } = this.state;

    return (
      <div ref={el => (this.mapContainer = el)} className="mapContainer">
        {this.getUserPoints().map((userPoint) => (
          <Marker userPointId={userPoint.id} key={userPoint.id} map={this} />
        ))}
        {apiData && (
          <div className="popup-content">
            <p>API Data:</p>
            <pre>{JSON.stringify(apiData, null, 2)}</pre>
          </div>
        )}
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

