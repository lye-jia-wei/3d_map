import React from 'react';
import { Provider } from 'react-redux';
import store from '../store';
import Map from './Map';
import './App.css';

class App extends React.Component {
  render() {
    return (
      <Provider store={store}>
        <div>
          <header>
            <div className="title">
              <span className="center">Interactive Map</span>
            </div>
            <p className="help-text">
              Explore shops and amenities by clicking on the map. 

            </p>

          </header>
          <Map />
        </div>
      </Provider>
    );
  }
}

export default App;
