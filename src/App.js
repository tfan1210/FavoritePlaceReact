import React, { Component } from 'react';
import './App.css';
import { allLocation } from './locations.js';
import scriptLoader from 'react-async-script-loader';
import {mapCustomStyle} from './mapCustomStyle.js';
import escapeRegExp from 'escape-string-regexp';
import sortBy from 'sort-by';
import fetchJsonp from 'fetch-jsonp';

//To track the markers and infoWindows
let markers = [];
let infoWindows = [];

class App extends Component {
  constructor(props) {
    super(props);
    this.state = {
      locations: allLocation,
      map: {},
      query: '',
      requestWasSuccessful: true,
      selectedMarker:'',
      data:[]
    }
  }

  //To update the query when the user use the filter field
  updatequery =(query) => {
    this.setState({query: query})
  }

  //Update the data fater geeting the info from the API
  updateData = (newData) => {
    this.setState({
      data:newData,
    });
  }

  componentWillReceiveProps({isScriptLoadSucceed}){
    //Make sure the script is loaded
    if (isScriptLoadSucceed) {
      //Creating the Map
      const map = new window.google.maps.Map(document.getElementById('map'), {
        zoom: 15,
        //Giving an initial locaiton to start
        center: new window.google.maps.LatLng(39.956623,-75.189933),
        styles: mapCustomStyle
      });
      this.setState({map:map});
    }
    else {
      //Handle the error
      console.log("Error:Cann't Load Google Map!");
      this.setState({requestWasSuccessful: false})
    }
  }

  componentDidUpdate(){
    //Filter the locations depending on the user input
    const {locations, query,map} = this.state;
    let showingLocations=locations
    if (query){
      const match = new RegExp(escapeRegExp(query),'i')
      showingLocations = locations.filter((location)=> match.test(location.title))
    }
    else{
      showingLocations=locations
    }
    markers.forEach(mark => { mark.setMap(null) });
    // Clear the markers and the infoWindows arrays
    markers = [];
    infoWindows = [];
    showingLocations.map((marker,index)=> {
    //Filter the data that is stored form wikipedia in the state to add them to windows info
    let getData = this.state.data.filter((single)=>marker.title === single[0][0]).map(item2=>
      {if (item2.length===0)
        return 'No Contents Have Been Found Try to Search Manual'
        else if (item2[1] !=='')
          return item2[1]
        else
          return 'No Contents Have Been Found Try to Search Manual'
      })
    let getLink = this.state.data.filter((single)=>marker.title === single[0][0]).map(item2=>
      {if (item2.length===0)
        return 'https://www.wikipedia.org'
        else if (item2[1] !=='')
          return item2[2]
        else
          return 'https://www.wikipedia.org'
      })
    let content =
    `<div tabIndex="0" class="infoWindow">
    <h4>${marker.title}</h4>
    <p>${getData}</p>
    <a href=${getLink}>Click Here For More Info</a>

    </div>`
      //Add the content to infoWindows
      let addInfoWindow= new window.google.maps.InfoWindow({
        content: content,
      });
      //Extend the map bound
      let bounds = new window.google.maps.LatLngBounds();
      //Create the marker
      let addmarker = new window.google.maps.Marker({
        map: map,
        position: marker.location,
        animation: window.google.maps.Animation.DROP,
        name : marker.title
      });
      //Add the marker to the list of marker
      markers.push(addmarker);
      infoWindows.push(addInfoWindow);
      addmarker.addListener('click', function() {
          //Close windows before open the another
          infoWindows.forEach(info => { info.close() });
          addInfoWindow.open(map, addmarker);
          //Clear he animaiton before add the new one
          if (addmarker.getAnimation() !== null) {
            addmarker.setAnimation(null);
          } else {
            //Add the aniamtion when the marker is clicked
            addmarker.setAnimation(window.google.maps.Animation.BOUNCE);
            setTimeout(() => {addmarker.setAnimation(null);}, 400)
          }
        })
      //Bounds
      markers.forEach((m)=>
        bounds.extend(m.position))
      map.fitBounds(bounds)
    })
  }

  componentDidMount(){
    //By using wikpedia, I fetch the data about a specific location title
    this.state.locations.map((location,index)=>{
      return fetchJsonp(`https://en.wikipedia.org/w/api.php?action=opensearch&search=${location.title}&format=json&callback=wikiCallback`)
      .then(response => response.json()).then((responseJson) => {
        let newData = [...this.state.data,[responseJson,responseJson[2][0],responseJson[3][0]]]
        this.updateData(newData)
      }).catch(error =>
      console.error(error)
      )
    })
  }

  //Trigger a specific marker when the list item is clicked
  listItem = (item, event) => {
    let selected = markers.filter((currentOne)=> currentOne.name === item.title)
    window.google.maps.event.trigger(selected[0], 'click');

  }
  //To support accessibility (https://stackoverflow.com/questions/34223558/enter-key-event-handler-on-react-bootstrap-input-component?utm_medium=organic&utm_source=google_rich_qa&utm_campaign=google_rich_qa)
  handleKeyPress(target,item,e) {
    if(item.charCode===13){
     this.listItem(target,e)
   }
 }

 render() {
  const {locations, query, requestWasSuccessful} = this.state;
    //get the filter query to filter the listitems
    let showingLocations
    if (query){
      const match = new RegExp(escapeRegExp(query),'i')
      showingLocations = locations.filter((location)=> match.test(location.title))
    }
    else{
      showingLocations=locations
    }
    showingLocations.sort(sortBy('title'))
    return (
      //If the request was successful and the map is there, render the elements
      requestWasSuccessful ? (
        <div>
        <nav className="nav">
        <span id="subject" tabIndex='0'>Favorite places within The United States</span>
        </nav>
        <div id="container">
        <div id="map-container" role="application" tabIndex="-1">
        <div id="map" role="region" aria-label="Philadelphia Neighborhood"></div>
        </div>
      {/*List view that has input and list of locaitons*/}
      <div className='listView'>
      <input id="textToFilter" className='form-control' type='text'
      placeholder='search location'
      value={query}
      onChange={(event)=> this.updatequery(event.target.value)}
      role="search"
      aria-labelledby="Search For a Location"
      tabIndex="1"/>
      <ul aria-labelledby="list of locations" tabIndex="1">
    {/*JSON.stringify(this.state.query)*/}
    {showingLocations.map((getLocation, index)=>
      <li key={index} tabIndex={index+2}
      area-labelledby={`View details for ${getLocation.title}`} onKeyPress={this.handleKeyPress.bind(this,getLocation)} onClick={this.listItem.bind(this,getLocation)}>{getLocation.title}</li>)}
      </ul>
      </div>
      </div>
      </div>
      ) : (
      <div>
      <h1>Error:Cann't Load Your Google Map</h1>
      </div>

      )
      )
    }
  }

  export default scriptLoader(
    [`https://maps.googleapis.com/maps/api/js?key=AIzaSyC22954MYCdMKvsyWaWvmPciLgsDfrx-Ms&v=3.exp&libraries=geometry,drawing,places`]
    )(App);
