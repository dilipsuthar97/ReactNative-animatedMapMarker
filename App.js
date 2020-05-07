import React from 'react';
import {
  StatusBar,
  StyleSheet,
  Dimensions,
  View,
  Platform,
  PermissionsAndroid,
  Alert,
} from 'react-native';
import MapView, { Marker, AnimatedRegion } from 'react-native-maps';
import Geolocation from 'react-native-geolocation-service';
import RNAndroidLocationEnabler from 'react-native-android-location-enabler';

import MapStyle from './src/MapStyle.json';

const { width, height } = Dimensions.get('window');
const ASPECT_RATIO = width / height;
const LATITUDE_DELTA = 0.0922;
const LONGITUDE_DELTA = LATITUDE_DELTA * ASPECT_RATIO;
const ZOOM_LEVEL = 13;

export default class App extends React.Component {
  state = {
    region: new AnimatedRegion({
      latitude: 0,
      longitude: 0,
      latitudeDelta: LATITUDE_DELTA,
      longitudeDelta: LONGITUDE_DELTA,
    }),
    coordinate: new AnimatedRegion({
      latitude: 0,
      longitude: 0,
      latitudeDelta: LATITUDE_DELTA,
      longitudeDelta: LONGITUDE_DELTA,
    }),
  };

  async componentDidMount() {
    console.disableYellowBox = true;

    if (Platform.OS === 'ios') {
      this.getCurrentLocation();
    } else {
      const granted = await PermissionsAndroid.check(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      );

      if (granted) {
        this.getCurrentLocation();
      } else {
        this.requestPormission();
      }
    }

    this.watchLocation();
  }

  /**
   * method for chack & request location permission for ANDROID
   */
  requestPormission = async () => {
    try {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        {
          title: 'Map App Location Permission',
          message: 'Map App needs access to your current location. ',
        },
      );
      if (granted === PermissionsAndroid.RESULTS.GRANTED) {
        RNAndroidLocationEnabler.promptForEnableLocationIfNeeded({
          interval: 10000,
          fastInterval: 5000,
        })
          .then(data => {
            if (data) {
              this.getCurrentLocation();
            }
          })
          .catch(() => {
            // alert(err)
          });
      } else {
        Alert.alert('Alert', 'Location permission is denied');
      }
    } catch (err) {
      Alert.alert('Alert', 'Location permission is denied');
    }
  };

  /**
   * method for getting current location on startup
   */
  async getCurrentLocation() {
    Geolocation.getCurrentPosition(
      async position => {
        var lat = await parseFloat(position.coords.latitude);
        var long = await parseFloat(position.coords.longitude);

        this.state.region.setValue({
          latitude: lat,
          longitude: long,
          latitudeDelta: LATITUDE_DELTA,
          longitudeDelta: LONGITUDE_DELTA,
        });

        this.state.coordinate.setValue({
          latitude: lat,
          longitude: long,
          latitudeDelta: LATITUDE_DELTA,
          longitudeDelta: LONGITUDE_DELTA,
        });
        this.setLocation(lat, long);

        // animate region to initial coords
        this.animateCamera(lat, long);
      },
      error => {
        console.log(JSON.stringify(error));
        Alert.alert(JSON.stringify(error));
      },
    );
  }

  /**
   * method for watching location update
   */
  watchLocation = async () => {
    //  THIS BLOCK OF CODE CALLED WHEN USER CHANGE HIS LOCATION START HERE
    this.watchIDMap = Geolocation.watchPosition(
      async position => {
        console.log('watchPosition: called');
        let location = position.coords;
        this.setLocation(location.latitude, location.longitude);
        if (location.latitude !== 0 && location.longitude !== 0) {
          console.log(
            'watchPosition: location: lat: ',
            location.latitude,
            ', long: ',
            location.longitude,
          );
        }
      },
      error => {
        Alert.alert('Alert', `Watch position error\n${error}`);
      },
      // { enableHighAccuracy: true, distanceFilter: 0, interval: 5000, fastestInterval: 5000 }
      { enableHighAccuracy: true, distanceFilter: 5 },
    );
  };

  /**
   * method for updating the region & coordinate value on new location
   * @param lat
   * @param long
   */
  async setLocation(lat, long) {
    console.log('setLocation: called');
    // Deprecated ----- but working fine
    // this.map.animateToCoordinate(
    //   {
    //     latitude: lat,
    //     longitude: long,
    //   },
    //   2000,
    // );

    console.debug(
      'Old LatLong: ',
      this.state.coordinate.latitude,
      ', ',
      this.state.coordinate.longitude,
    );
    console.debug('New LatLong: ', lat, ', ', long);

    console.log('Map Boundaries: ', this.map && await this.map.getMapBoundaries());

    const { northEast, southWest } = this.map && await this.map.getMapBoundaries();

    // check if marker goes out from screen and update region camera view
    if (lat < northEast.latitude && lat > southWest.latitude) {
      console.log('Maker is inside Y direction');

      if (!(long < northEast.longitude && long > southWest.longitude)) {
        this.animateCamera(lat, long);
      } else {
        console.log('Maker is inside X direction');
      }
    } else {
      this.animateCamera(lat, long);
    }

    // set cords value for marker
    this.state.coordinate.setValue({
      latitude: lat,
      longitude: long,
      latitudeDelta: LATITUDE_DELTA,
      longitudeDelta: LONGITUDE_DELTA,
    });

    // animate marker position to new coords
    if (Platform.OS === 'android') {
      if (this.marker) {
        this.marker.animateMarkerToCoordinate(
          {
            latitude: lat,
            longitude: long,
            latitudeDelta: LATITUDE_DELTA,
            longitudeDelta: LONGITUDE_DELTA,
          },
          500,
        );
      }
    } else {
      this.state.coordinate
        .timing({
          latitude: lat,
          longitude: long,
          latitudeDelta: LATITUDE_DELTA,
          longitudeDelta: LONGITUDE_DELTA,
          duration: 500,
        })
        .start();
    }
  }

  /**
   * method for animate the region camera position
   * @param lat
   * @param long
   */
  animateCamera(lat, long) {
    this.map && this.map.animateCamera(
      {
        center: {
          latitude: lat,
          longitude: long,
        },
        pitch: 0,
        heading: 0,
        zoom: ZOOM_LEVEL,
      },
      3000,
    );
  }

  render() {
    return (
      <View style={styles.container}>
        <StatusBar translucent backgroundColor="rgba(0,0,0,0.3)" />
        <MapView.Animated
          style={styles.mapView}
          region={this.state.region}
          ref={ref => {
            this.map = ref;
          }}
          // showsUserLocation={true}
          showsBuildings={true}
          loadingEnabled={true}
          zoomEnabled={true}
          maxZoomLevel={ZOOM_LEVEL}>
          <Marker.Animated
            title="Your location"
            coordinate={this.state.coordinate}
            ref={marker => {
              this.marker = marker;
            }}
          />
        </MapView.Animated>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
  },
  mapView: {
    flex: 8,
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  image: {
    width: 40,
    height: 40,
    resizeMode: 'contain',
    zIndex: 3,
  },
});
