# Little Engine

[Custom Elements](https://developer.mozilla.org/en-US/docs/Web/Web_Components/Using_custom_elements) allow front-end web developers to create encapsulated, reusable components without needing a heavy-handed framework. However, actually creating a composable system of custom elements requires a fair bit of organization and discipline, as well as knowing the common gotchyas. **Little Engine** provides you with a well-structured foundation, so you can just start building your custom elements.

## Installation

```
npm install little-engine
```

## Usage

```js
import LittleEngine from 'little-engine';

export const MyElement = LittleEngine.define('my-element', (root, refresh) => {
    root.innerHTML = `
        <button>Click me!</button>
        <div>The current value is: <span></span></div>
    `;

    const button = root.querySelector('button');
    const span = root.querySelector('span');
    let currentValue = 0;

    button.addEventListener('click', () => {
        currentValue += 1;
        refresh();
    });

    return {
        refresh() {
            span.textContent = currentValue;
        }
    };
});
```

> The `root` variable is your custom element's [`ShadowRoot`](https://developer.mozilla.org/en-US/docs/Web/API/ShadowRoot), which hides everything inside it from the outside world.

#### "Wow, that's a lot of code for such a simple component!"

Little Engine is not a full-service framework. It just provides a solid foundation for defining custom elements. Feel free to bring whatever tools you like to make your code more expressive. The `MyElement` example above can be greatly shortend with [jQuery](https://jquery.com/) (*gasp!*).

## Why use Little Engine instead of `<insert framework here>`?

- **Build smart.** Little Engine provides a simple foundation for creating reusable components. Even without a framework, that's definitely something you want.
- **Build anything.** Frameworks are designed with specific use-cases in mind. Even [React](https://reactjs.org/) is poorly suited for many kinds of applications which require manual DOM manipulation. When you choose a framework, you lock yourself in to the use-cases of its creators. When you use Little Engine, you work directly with the [DOM](https://developer.mozilla.org/en-US/docs/Web/API/Document_Object_Model/Introduction), so you can do whatever you need to do, without fighting against someone else's philosophy.
- **Avoid pitfalls**. Without a framework, it's easy to make mistakes which lead to [spaghetti code](https://en.wikipedia.org/wiki/Spaghetti_code#:~:text=Spaghetti%20code%20is%20a%20pejorative,with%20insufficient%20ability%20or%20experience.), introduce bugs, and slow down your application. Little Engine provides a minimal structure for organizing the logic within your components, increasing your chances of writing robust code. Unlike big frameworks though, it always keeps you in control of your application.

## What Little Engine does

- Provides a simple interface for defining Custom HTML Elements, taking advantage of the [Shadow DOM](https://developer.mozilla.org/en-US/docs/Web/Web_Components/Using_shadow_DOM) for encapsulation.
- Provides a well-structured rendering engine, so your renders are efficient, reliable, and *not* powered by spaghetti code.
- Provides basic interfaces for manipulating your custom elements from the outside, helping you to avoid common pitfalls such as accidentally defining a method or attribute that already exists on [`HTMLElement`](https://developer.mozilla.org/en-US/docs/Web/API/HTMLElement).

## What Little Engine **doesn't** do

- Provides a high-level framework that lets you forget about the DOM (until you actually need it...).
- Lies to you by suggesting that by using THIS framework, you'll never have to worry about performance!
- Vendor-locks you into one system that you can't escape until it's too late.

# Docs

## Defining a Custom Element

Use `LittleEngine.define` to define a custom element. It returns a subclass of `LittleEngine`, which is a subclass of [`HTMLElement`](https://developer.mozilla.org/en-US/docs/Web/API/HTMLElement). The custom element is automatically registered using the given tag name. Note that per the Web Component standards, custom elements must contain a dash (`-`) in their name.

```js
import LittleEngine from 'little-engine';

export const MyElement = LittleEngine.define('my-element', (root, refresh) => {
    // ...
});
```

The function passed to `LittleEngine.define` acts as the constructor function for your custom element. The `root` parameter is your element's [`ShadowRoot`](https://developer.mozilla.org/en-US/docs/Web/API/ShadowRoot). Anything inside the `ShadowRoot` is hidden from the outside world.

## Setting up your Custom Element

In your constructor function, you'll typically add some elements to the `ShadowRoot`, which could be done manually with `document.createElement` or `root.innerHTML`, or with your templating engine of choice (even JSX! But that's your responsibility). You'll also typically add [event listeners](https://developer.mozilla.org/en-US/docs/Web/API/EventTarget/addEventListener). For complex components, we recommend using [event delegation](https://developer.mozilla.org/en-US/docs/Learn/JavaScript/Building_blocks/Events#event_delegation), so your listeners are immune to underlying changes in the DOM (not shown below).

```js
LittleEngine.define('my-element', (root, refresh) => {
    const button = document.createElement('button');
    root.appendChild(button);

    button.addEventListener('click', () => {
        doSomething();
    });

    // ...
});
```

## Rendering your Custom Element

Your constructor function must return a `refresh()` function, which is responsible for updating your component visually. The `refresh()` function is automatically called when your custom element is attached to [the document](https://developer.mozilla.org/en-US/docs/Web/API/Document), and is never called when your element is detached from the document.

```js
LittleEngine.define('my-element', (root, refresh) => {
    const div = document.createElement('div');
    root.appendChild(div);

    return {
        refresh() {
            div.textContent = `Your lucky number is ${Math.random()}!`;
        }
    };
});
```

Unlike, the pervasive "reactive" frameworks that exist, Little Engine does NOT dictate when your component should be updated. You have total control over this!

> If you've ever used React and found that large component trees were being re-rendered constantly and unnecessarily, or that HTTP calls inside of [useEffect](https://reactjs.org/docs/hooks-effect.html) were being rapid-fired, you'll know the pain of "reactivity"! With Little Engine, nothing will happen unless you tell it to.

Luckily, it's extremely easy to schedule a re-render: simply call the `refresh()` function that's provided as the second argument to `LittleEngine.define`. When you call `refresh()`, your refresh function is scheduled to happen during the next "render phase" (asynchronously). This allows Little Engine's renderer to avoid redundant work (making your app faster and more efficient). Also, the renderer is able to guarantee that all descendant `LittleEngines` in the document tree are rendered *before* their ancestors. This turns out to be extremely helpful for state management, which we'll talk about later.

```js
LittleEngine.define('my-element', (root, refresh) => {
    root.innerHTML = `
        <button>Click me!</button>
        <div>The current value is: <span></span></div>
    `;

    const button = root.querySelector('button');
    const span = root.querySelector('span');
    let currentValue = 0;

    button.addEventListener('click', () => {
        currentValue += 1;
        refresh(); // Schedule a refresh to happen soon.
    });

    return {
        refresh() {
            span.textContent = currentValue;
        }
    };
});
```

## Defining mutations on your Custom Element

Sometimes, you'll want to allow external JavaScript code to modify the state of your custom element. LittleEngine supports this by allowing you to define *mutations*. These are actually just methods that are placed under a common namespace, to prevent you from accidentally overriding a method that already exists on [`HTMLElement`](https://developer.mozilla.org/en-US/docs/Web/API/HTMLElement).

```js
LittleEngine.define('my-element', (root, refresh) => {
    root.innerHTML = `
        <div>The current value is: <span></span></div>
    `;

    const span = root.querySelector('span');
    let currentValue = 0;

    return {
        refresh() {
            span.textContent = currentValue;
        },
        mutations: {
            increment() {
                currentValue += 1;
                refresh();
            }
        }
    };
});
```

Mutations are accessed from the `mutate` property of your custom element, as shown below.

```js
const myElement = document.createElement('my-element');
myElement.mutate.increment();
```

> Note that mutations can return values, so they could technically be used to implement "getters", but it's generally a bad idea to do that (hence why they're called "mutations", and not "methods"). To avoid spaghetti code, it's a good idea to be disciplined about exposing a component's internal state, which we'll discuss more in a later section.

## Defining attributes/options on your Custom Element

It's common for an HTML element to accept certain attributes which modify its behavior. Unfortunately the Web Components standard did not reserve any namespace for us poor developers to actually define our own custom attributes. This is important because if you define a custom attribute called "version" (just as an example), then some day the [WHATWG standards people](https://whatwg.org/) could decide to define a new standard attribute called "version", and now your component is completely broken because browsers will erroneously start implementing new behavior on your component, which you couldn't have anticipated. This is an [open issue for WHATWG](https://github.com/whatwg/html/issues/2271).

The [`data-*`](https://developer.mozilla.org/en-US/docs/Learn/HTML/Howto/Use_data_attributes) attributes are technically reserved for the _consumers_ of your custom element, so you can't use those either. Other frameworks have chosen to prefix all of their custom attributes with a common prefix (for example, `ng-*` in [Angular](https://angular.io/)). This seems like the best option, since it reduces the surface area of potential namespace collisions from `infinity` to `1`.

Therefore, Little Engine allows you to define custom attributes under the namespace `opt-*`, which is short for "option". You can return option handers from your constructor function to be notified when an `opt-*` attribute changes.

```js
LittleEngine.define('my-element', (root, refresh) => {
    const div = document.createElement('div');
    div.textContent = 'Hello world!';
    root.appendChild(div);

    let color = 'red';

    return {
        refresh() {
            div.style.color = color;
        },
        options: {
            color(value) {
                color = value;
                refresh();
            }
        }
    };
});

document.body.innerHTML = `
    <my-element opt-color="blue"></my-element>
`;
```

In the example above, the `color()` function will be invoked whenever the `opt-color` attribute changes on the custom element. If the element is created with the attribute already present (e.g., `<my-element opt-color="blue"></my-element>`), or if the attribute is added within the constructor function, then the `color()` function will be invoked immediately after the constructor returns. If the attribute is deleted, the `color()` function will be invoked with `null` as its argument.

## Managing state in your Custom Element

Okay! Now we're getting to the good stuff! In case you didn't know, avoiding spaghetti code is all about state management. So if you get this wrong (even if you're using a framework that claims to "solve" state management, LOL), you're screwed.

How does Little Engine do state management? Well, in the end, you have total control over everything, but we _do_ provide a few suggestions and a mental model to work with.

### Public state verses private state

For any good abstraction, the goal is to hide complex details and expose a simpler version of what's actually happening. Little Engine is no different. As you've seen from previous examples, you can define whatever _private_ state you want just by using regular old JavaScript variables in the constructor function. Naturally, the outside world can't see that private state. In the example below, `currentValue` is an example of _private state_.

```js
LittleEngine.define('my-element', (root, refresh) => {
    root.innerHTML = `
        <button>Click me!</button>
        <div>The current value is: <span></span></div>
    `;

    const button = root.querySelector('button');
    const span = root.querySelector('span');
    let currentValue = 0;

    button.addEventListener('click', () => {
        currentValue += 1;
        refresh();
    });

    return {
        refresh() {
            span.textContent = currentValue;
        }
    };
});
```

However, it's also important for components to be _composable_, which means larger components can use smaller components to do more complex things. Therefore, the larger component needs access to some _state_ from the smaller component. This is where _public_ state comes in.

In Little Engine, you define your public state by **returning** it from the `refresh()` function. If your component doesn't need to expose any public state, the `refresh()` function doesn't need to return anything.

```js
return {
    refresh() {
        // ... do render-related things
        return myPublicState;
    }
};
```

A component can use the public state of its descendants by using the `getState()` function, which is provided as an argument to the `refresh()` function. Components can be notified of state changes in their descendants by listening for the `refresh` event, which is automatically emitted when a `LittleEngine` refreshes.

```js
LittleEngine.define('my-element', (root, refresh) => {
    const slot = document.createElement('slot');
    slot.addEventListener('refresh', refresh);
    root.appendChild(slot);

    return {
        refresh(getState) {
            for (const child of slot.assignedElements()) {
                if (child instanceof LittleEngine) {
                    console.log(getState(child));
                }
            }
        }
    };
});
```

### An example of using public state

We'll tie all of this together to implement a form element from scratch, called `<bigint-form>`, and an input-like element called `<bigint-input>`.

```js
import LittleEngine from 'little-engine';

const BigintInput = LittleEngine.define('bigint-input', (root, refresh) => {
    root.innerHTML = `
        <style>
            [role="input"] {
                display: inline-flex;
                align-items: center;
                min-width: 10ch;
                padding: 0.5ch 1ch;
                box-shadow: 0.5px 0.5px 3px 0px rgb(40 40 40 / 75%);
            }
        </style>
        <div role="input" contenteditable>0</div>
    `;

    const input = root.querySelector('[role="input"]');
    input.addEventListener('input', refresh);

    return {
        refresh() {
            const value = input.textContent.replace(/[^\d]/g, '');;
            input.textContent = value;
            return BigInt(value);
        }
    };
});

const BigintForm = LittleEngine.define('bigint-form', (root, refresh) => {
    root.innerHTML = `
        <div>Total sum = <span></span></div>
        <div><slot></slot></div>
    `;

    const span = root.querySelector('span');
    const slot = root.querySelector('slot');
    slot.addEventListener('refresh', refresh);

    return {
        refresh(getState) {
            let sum = 0n;

            for (const el of slot.assignedElements()) {
                if (el instanceof BigintInput) {
                    sum += getState(el);
                }
            }

            span.textContent = String(sum);

            return sum;
        }
    };
});
```

```html
<bigint-form>
    <bigint-input></bigint-input>
    <bigint-input></bigint-input>
</bigint-form>
```

Let's take a look at how this all works.

The `<bigint-input>` element renders an editable div. Each render, the div's content is sanitized so it can only contain decimal digits, and its current value is returned as a [`BigInt`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/BigInt). The line `input.addEventListener('input', refresh)` ensures that the element is re-rendered each time the div is edited.

The `<bigint-form>` element contains a `<slot>`, where the user may place any number of `<bigint-input>` elements (and anything else they desire). The `slot.addEventListener('refresh', refresh)` ensures that the element is re-rendered each time a child input is rendered. Since `<bigint-input>` exposes its current value as _public state_, the `<bigint-form>` can calculate a sum of all child inputs. It uses `getState(el)` to get their public states, and then adds them up. The `<bigint-form>` itself returns the sum as its own public state, so other components may use it for their own purposes.

Note that we're not *required* to update the form every time an input is updated. If it's very expensive to recalculate the form's result (e.g., perhaps it involves many HTTP requests), we can simply remove `slot.addEventListener('refresh', refresh)` and use whatever logic we want for calling `refresh()`. Perhaps we'd like to debounce it, throttle it, or use a button press. These would all be trivial changes because we're not using a framework that assumes everybody wants reactivity all the time! Also, note how the parent is responsible for _pulling_ the data it wants, _when_ it wants. There's no need for children to _push_ data on every update, which would require complex _state reducers_ (hello Redux).

For more complex elements, the public state will generally be an object containing multiple fields. There's no restriction on what kind of value you can return from `refresh()`.

### This feels weird... We're passing state... up??

Yup! If you've ever used React, this seems like the exact oppsite of what you're used to. In React, state is passed _down_, from parent to child. With Little Engine, state is passed _up_ from child to parent. Why? Because we're rebels!! No, actually, there is a very good reason.

Little Engine agrees with React on one thing: unidirectional data flow is a good thing. We just disagree on which direction it should be!

In React, when an event occurs within some component, it has a choice: either set some state inside the component itself, or pass the state to its parent via a callback. The problem is, if two components need to use the same state, the state must be moved up to their nearest common ancestor, so the only real choice is to pass the state to the parent. In other words, if your UI has complex interactions between components that rely on each other, all the state ends up being bubbled up to the top-most component, and every other component becomes stateless! Now, you effectively have one component containing _all_ of your business logic, and bunch of other components that literally just render HTML templates. You have not actually componentized your application: all of your business logic is in one place! That can very quickly become very difficult to maintain.

In Little Engine, when an event occurs within some component, it also has a choice: either set some state inside the component itelf, or pass the state to its _child_, via a mutation (or by setting an `opt-*` attribute). In the second case, the child is completely responsible for managing that state, and then it can "report" what's going on via its public state. If two components need to share the same state, they don't need to defer to their parent for everything; one child _owns_ the state (one "writer"), and the other children can be _notified_ of the state (multiple "readers"). To accomplish this, a common ancestor reads the public state of the owner (via `getState()`), and then sends mutations to the children that need to be notified. Yes, there's still a common ancestor, but it just passes messages around; it doesn't need to take ownership of the state or the associated business logic. This way, the business logic can be divvied up between lots of small components, and there's no need to have an all-knowing top-level component.

There's an anology to be made here. In React, the higher-level components are like dictators who make all the decisions. It's effectively a centralized government. Every time a child component wants to do *anything*, it must ask its parent (via a callback), who must ask *its* parent, etc., until some high-ranking component makes a decision and sends that decision back down the chain (via props). One ruler makes all the decisions. If you've ever worked in a company that operates like this, you know it's hell.

In Little Engine, each little component is capable of making its own decisions. The little components simply "report" back to their bosses what's going on, and the bosses use that aggregated information to dispatch communication and delegate tasks to other little components. If you've ever worked in a company that operates like this, you know it's a much better situation to be in.

> To be specific... Little components "report" back to their bosses by using public state (returning data from `refresh()`). The boss components use the aggregated information via `getState()`, and they dispatch communication and delegate tasks to other little components by calling mutations and settings `opt-*` attributes).

## How to achieve consistency

In general, you should do all calculation within the `refresh()` function. If you split up your logic between event handlers, you end up with spaghetti code. In most cases, your event handlers should do basically nothing except mutate some internal state or call `refresh()`. Mutations and `opt-*` attributes are the same: they are for mutating internal state, not for doing calculations. If you keep all calculations within `refresh()`, your component will always have a consistent public state and a consistent render on screen.

> "But wait, if I have to recalculate everything every time my component renders, won't that be slow?" Maybe! But computers are fast these days, and browsers are fast, and Little Engine gives you total control over when your component renders (unlike "reactive" frameworks, which lie and tell you not to worry about it, because they're sooooo fast and efficient). Take control over your code, brave one! Only YOU can stop unnecessary renders! Anyway, you can still implement the same tricks you do in frameorks like React (e.g., memoization).

In summary:
- Mutations, event listeners, and `opt-*` attributes are for _accepting_ incoming information.
- The `refresh()` function is for _digesting_ all current information, updating the screen, and calculating the current public state.

If you follow these guidelines, your components will always be in a consistent state after each refresh, and ancestor components can use their state for making accurate decisions.

Also note that you're not `required` to return data from `refresh()`, or use the `refresh` event at all. You're free to [dispatch](https://developer.mozilla.org/en-US/docs/Web/API/EventTarget/dispatchEvent) your own custom events when needed. And this can actually be a great practice! I know you've been trained by React to constantly repeat yourself by passing the same damn callback to every damn component in a hierarchy, but don't be gloomy: we've had the much more powerful [event bubbling](https://developer.mozilla.org/en-US/docs/Learn/JavaScript/Building_blocks/Events#event_bubbling) system forever!

### But using this library seems... hard!

Maybe! Little Engine is a low-level library. It's a foundation. You're expected to BYOL (bring your own libraries) for making it more high-level. For example, jQuery can help a lot. There might be other utilities or patterns which you find useful, such as a templating engine or JSX. Little Engine is not trying to solve _all_ your problems—just the problem of creating reusable components from Custom HTML Elements. Good luck!
