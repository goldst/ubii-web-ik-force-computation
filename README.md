# ubii-web-ik-force-computation – Work in progress
Ubi-Interact Inverse Kinematics and force computation for web browsers. This is a necessary step in physical embodiment scenarios, where users are represented virtually through a physical avatar.

## Usage
Ubii-web-ik-force-computation can be used either as a standalone demo or as a node module in Your own applications.

## Prerequisites
This project communicates with a [Ubi-Interact master node](https://github.com/SandroWeber/ubii-node-master). Even though some of the functionality can be tested without it, it is recommended to have one.

To calculate a full pose using inverse kinematics, this module receives IK targets from another Ubi-Interact component. [ubii-web-target-publisher](https://github.com/goldst/ubii-web-target-publisher) simplifies the process of publishing targets using abstractions similar to the ones in this module.

To calculate the necessary forces and applying them to a physical avatar, this module needs to communicate with other Ubi-Interact components. [ubii-web-avatar-applier](https://github.com/goldst/ubii-web-target-publisher) simplifies this process using similar abstractions to this module as well.

### Online Demo
The demo in this project is available at https://goldst.dev/ubii-web-ik-force-computation/dist/.

### Running the demo locally
After cloning, install, and run the project:
```bash
npm install
npm start
```
Your terminal will contain the demo URL, e.g. http://localhost:8080. Note that the command starts a development server which is not suitable for production environments.

### Using this project as a node module
To your existing node project, add the module:
```bash
npm i ubii-web-ik-force-computation
```

You can either initialize the processor in HTML using the bundled version:
```html
<script src=".node_modules/ubii-web-ik-force-computation/dist/bundle.js"></script>

<script>
    new UbiiWebIkForceComputation.Processor(options);
</script>
```

Or you can import it directly in your JavaScript/TypeScript project:
```js
import { Processor } from 'ubii-web-ik-force-computation';

new Processor(options);
```

For available options, see [ProcessorOptions.ts](./src/ProcessorOptions.ts).

That's it! Other than supplying the options, no further configuration is necessary. If you want to stop the processor, just call `stop()` on the processor object.

## Development status and contributing
This project is work in progress. Let me know if you have any issues! Currently I'm not taking code contributions, because it is part of an university project. I am planing to open it up in June.

<!-- TODO replace section once bachelors thesis is finished>

Don't expect me to update this project that much once it's done :upside_down_face: but your code and documentation contributions are warmly welcomed. Make sure to create an issue first if you want to work on something and let me know there.
<-->

## License
[MIT](LICENSE)
