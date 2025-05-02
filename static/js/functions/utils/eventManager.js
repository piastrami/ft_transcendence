/*

To use this function, declare an instance of EventManager in your class and use it to add event listeners.

Example usage in a class:
import { EventManager } from './path/to/EventManager.js';

export default class SomeClass {
    constructor() {
        this.eventManager = new EventManager();
    }

    setupEventListeners() {
        const button = document.getElementById('my-button');
        this.eventManager.addEventListener(button, 'click', this.handleMyButtonClick, this);
    }

    handleMyButtonClick() {
        // Whatever your button does
    }

    cleanup () {
        this.eventManager.removeAll(); 
        const button = document.getElementById('my-button');
        if (button) {
            button.remove();
        }
    }
}

*/

export class EventManager {
    constructor() {
        this.events = [];
    }

    addEventListener(element, type, handler, context = null) {
        // If a context is provided, bind the handler to the context. Eg. the class / view where the element is created 
        if (context) {
            handler = handler.bind(context);
        }

        if (element) {
            element.addEventListener(type, handler);
        }

        // Store the element, event type, handler, and the context used for binding
        this.events.push({ element, type, handler, context });
    }

    removeAll() {
        // Iterate through stored events and remove each one
        this.events.forEach(event => {
            // If a context was used, the handler is already bound with that context
            event.element.removeEventListener(event.type, event.handler);
        });
        this.events = []; // Clear the stored events after removal
    }

    removeEventListener(element, type, handler) {
        // Find the event in the list and remove it
        const eventIndex = this.events.findIndex(event => 
            event.element === element && 
            event.type === type && 
            event.handler === handler
        );

        if (eventIndex !== -1) {
            const event = this.events[eventIndex];
            event.element.removeEventListener(event.type, event.handler);
            this.events.splice(eventIndex, 1); // Remove it from the list
        }
    }
}
