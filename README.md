# Package README

This package is designed to facilitate the creation and execution of pipelines for data processing and API interactions. It provides a structured approach to defining pipeline steps, including API calls, data processing, and notifications.

## Features

* Define pipeline steps using a JSON configuration file
* Supports API calls (GET, POST, etc.) with caching and timeout options
* Data processing capabilities, including filtering and mapping
* Notification capabilities via API posts
* Automatic generation of AWS resources for pipeline execution
* Minification of generated JavaScript code for efficient deployment

## Usage

To use this package, you will need to:

1. Define your pipeline steps in a JSON configuration file (e.g., `pipeline.json`)
2. Provide metadata for your pipeline (e.g., `metadata.json`)
3. Run the `buildExecutable` function, passing in the pipeline data and metadata as JSON strings
4. The function will generate a minified JavaScript file that can be deployed to AWS Lambda

## Example

For an example of how to use this package, refer to the `index.ts` file in the root of this project. It demonstrates how to build an executable pipeline from JSON data and metadata.

## Contributing

Contributions to this package are welcome. Please submit pull requests with your proposed changes.

## License

This package is licensed under the MIT License.
