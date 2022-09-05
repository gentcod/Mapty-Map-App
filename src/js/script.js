'use strict';

// prettier-ignore
const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');
const sidebar = document.querySelector('.sidebar')


///////////////////////////////////////
//Data Architecture
//Parent class for data
class Workout {
    id = (Date.now() + '').slice(-10); //Convert date to string and use last 01 numbers
    date = new Date();
    day = Intl.DateTimeFormat('en-US', {month:"long", day: 'numeric'}).format(new Date())
    clicks = 0;

    constructor(distance, duration, coords) {
        this.distance = distance; //in km
        this.duration = duration; //in mins
        this.coords = coords; //[latitutde, longitude]
    }

    click() {
        this.clicks++;
    }
}

//Child classes
class Running extends Workout {
    type = 'running';

    constructor(distance, duration, coords, cadence) {
        super(distance, duration, coords)
        this.cadence = cadence;
        this.calcPace()
    }

    calcPace() {
        // min/km
        this.pace = this.duration / this.distance
        return this.pace
    }
}

class Cycling extends Workout {
    type = 'cycling'

    constructor(distance, duration, coords, elevationGain) {
        super(distance, duration, coords)
        this.elevationGain = elevationGain;
        this.calcSpeed()
    }

    calcSpeed() {
        // km/hr
        this.speed = this.distance / (this.duration / 60)
        return this.speed;
    }
}

//////////////////////////////////////
//Application Architecture
class App {
    #map;
    #mapZoomLevel = 13;
    #mapEvent;
    #workouts = [];

    constructor() {
        //Get user position
        this._getposition();

        //Get local storage
        this._getLocalStorage();

        //Event listeners
        form.addEventListener('submit', this._newWorkout.bind(this));
        inputType.addEventListener('change', this._toggleElevationField.bind(this));
        containerWorkouts.addEventListener('click', this._moveMap.bind(this));
    }
    _getposition() {
        //Geolocation API: takes two callback functions as parameters; 1. Success callback, 2. Failure callback
        if(navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(this._loadMap.bind(this), //Success callback
            function() {alert('Could not retrieve position');}) //Failure callback
        }
    }

    _loadMap(position) {
        const {latitude} = position.coords;
        const {longitude} = position.coords;
        // console.log(`https://www.google.com/maps/@${latitude},${longitude}`);

        const coords = [latitude, longitude];

        this.#map = L.map('map').setView(coords, this.#mapZoomLevel);
        // console.log(map)

        L.tileLayer('https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(this.#map);
        
        //Handling clicks 0n map
        this.#map.on('click', this._showForm.bind(this));

        //Render previous markers
        this.#workouts.forEach(data => {
            this._renderWorkoutMarker(data);
        })
    }

    _showForm(mapE) {
        this.#mapEvent = mapE;
        form.classList.remove('hidden');
        inputDistance.focus();
    }

    _hideForm() {
        inputCadence.value = inputDistance.value = inputDuration.value = inputElevation.value = '';

        form.style.display = 'none';
        form.classList.add('hidden');
        setTimeout(() => form.style.display = 'grid', 1000)
    }

    _toggleElevationField() {
        inputCadence.closest('.form__row').classList.toggle('form__row--hidden');
        inputElevation.closest('.form__row').classList.toggle('form__row--hidden')
    }

    _newWorkout(e) {
        e.preventDefault();

        //Get data from form
        const type = inputType.value;
        const distance = +inputDistance.value;
        const duration = +inputDuration.value;

        //Validate data
        // const validate = data => {if (!Number.isFinite(distance) || !Number.isFinite(duration) || !Number.isFinite(data)) return alert('Inputs have to be positive numbers')}
        const validInputs = (...inputs) => inputs.every(input => Number.isFinite(input));
        const allPositive = (...inputs) => inputs.every(input => input > 0);
        const {lat, lng} = this.#mapEvent.latlng;
        const coords = [lat, lng];

        let workout;

        
        //If workout is running, create running object
        if (type === 'running') {
            const cadence = +inputCadence.value;
            //Validate data
            // validate(cadence)
            if (!validInputs(distance, duration, cadence) || !allPositive(distance, duration, cadence)) return alert('Inputs have to be positive numbers');
            workout = new Running(distance,duration,coords,cadence);
        }
        
        //If workout is cycling, create cycling object
        if (type === 'cycling') {
            const elevation = +inputElevation.value;
            //Validate data
            if (!validInputs(distance, duration, elevation) || !allPositive(distance, duration)) return alert('Inputs have to be positive numbers');
            workout = new Cycling(distance,duration,coords,elevation);
        }

        //Add new object to workout array
        this.#workouts.push(workout)
        
        //Render workout on map as marker
        this._renderWorkoutMarker(workout)

        //Render workout on list
        this._renderWorkoutList(workout)
        
        //Hide form and clear input fields
        this._hideForm()
    
        //Set local storage to all workouts
        this._setLocalStorage()
    }

    setAttribute (workout, a, b) {
        return workout.type === 'running' ? a : b;
    }

    _renderWorkoutMarker(workout) {
        L.marker(workout.coords).addTo(this.#map).bindPopup(L.popup({
            maxWidth: 250,
            minWidth: 100,
            autoClose: false,
            closeOnClick: false,
            className: `${workout.type}-popup`,
        })).setPopupContent(this.setAttribute(workout, `🏃🏾‍♂️ Running on ${workout.day}`, `🚴‍♀️ Cycling on ${workout.day}`))
        .openPopup()
    }

    _renderWorkoutList(workout) {
        //Create new html elements
        const html = `
        <li class="workout workout--${workout.type}" data-id="${workout.id}">
            <h2 class="workout__title">${this.setAttribute(workout,`Running on ${workout.day}`, `Cycling on ${workout.day}`)}</h2>
            <div class="workout__details">
                <span class="workout__icon">${this.setAttribute(workout, '🏃🏾‍♂️', '🚴‍♀️')}</span>
                <span class="workout__value">${workout.distance}</span>
                <span class="workout__unit">km</span>
            </div>
            <div class="workout__details">
                <span class="workout__icon">⏱</span>
                <span class="workout__value">${workout.duration}</span>
                <span class="workout__unit">min</span>
            </div>
            <div class="workout__details">
                <span class="workout__icon">⚡️</span>
                <span class="workout__value">${this.setAttribute(workout, workout.pace, workout.speed)}</span>
                <span class="workout__unit">${this.setAttribute(workout, 'min/km', 'km/h')}</span>
            </div>
            <div class="workout__details">
                <span class="workout__icon">${this.setAttribute(workout, '🦶🏼', '⛰')}</span>
                <span class="workout__value">${this.setAttribute(workout, workout.cadence, workout.elevationGain)}</span>
                <span class="workout__unit">${this.setAttribute(workout, 'spm','m')}</span>
            </div>
        </li>
        `;

        form.insertAdjacentHTML('afterend', html);
    }

    _moveMap(e) {
        const workoutEl = e.target.closest('.workout')

        if(!workoutEl) return;

        const workout = this.#workouts.find(work => work.id === workoutEl.dataset.id)

        this.#map.setView(workout.coords, this.#mapZoomLevel, {
            animate: true,
            pan: {
                duration: 1,
            },
        });

        //User interface interaction
        // workout.click();
    }

    _setLocalStorage() {
        localStorage.setItem('workouts', JSON.stringify(this.#workouts));
    }

    _getLocalStorage() {
        //Reconverting local storage string into objects
        const data = JSON.parse(localStorage.getItem('workouts'));
        // console.log(data)

        if (!data) return;

        //Restoring the data into the workouts array
        this.#workouts = data;

        this.#workouts.forEach(data => {
            // this._renderWorkoutMarker(data);
            this._renderWorkoutList(data);
        })
    }

    reset() {
        localStorage.removeItem('workours');
        location.reload();
    }
}

const app = new App();