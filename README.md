# Salesforce sObject SDK Generator [_(@skyleague/salesforce-sobject-sdk-generator)_](https://skyleague.github.io/salesforce-sobject-sdk-generator/)

<p>
  <img alt="Lines of code" src="https://img.shields.io/tokei/lines/github/skyleague/salesforce-sobject-sdk-generator" />
  <img alt="Version" src="https://img.shields.io/github/package-json/v/skyleague/salesforce-sobject-sdk-generator" />
  <!-- <img alt="LGTM Grade" src="https://img.shields.io/lgtm/grade/javascript/github/skyleague/salesforce-sobject-sdk-generator" /> -->
  <img src="https://img.shields.io/badge/node-%3E%3D16-blue.svg" />
  <a href="#" target="_blank">
    <img alt="License: MIT" src="https://img.shields.io/badge/License-MIT-yellow.svg" />
  </a>
</p>

This _independent_ TypeScript SDK generator automates the generation of OpenAPI definitions for the [Salesforce sObjects REST API](https://developer.salesforce.com/docs/atlas.en-us.api_rest.meta/api_rest/openapi_beta.htm) based on the published documentation.

Salesforce sObject API provides a powerful and flexible way to interact with Salesforce objects and data, allowing developers to perform create, read, update, and delete (CRUD) operations programmatically. This API offers a wide range of functionality, including data modeling, validation, security, and integration capabilities. By leveraging the sObject API, developers can build custom applications that seamlessly integrate with Salesforce, automate complex business processes, and improve overall productivity. Additionally, the API enables developers to work with data in a more efficient and scalable manner, which ultimately leads to better user experiences and increased business value.

Salesforce is highly customizable, and every organization has unique requirements for its data layout, structure, workflows, and customizations. Therefore, a standardized software development kit (SDK) that works for all organizations is not feasible. Instead, each organization must create a custom SDK tailored to its specific needs to ensure seamless integration with its Salesforce environment. However, creating a custom SDK manually can be a laborious and error-prone process, requiring a significant investment of time and effort. Automated tools can simplify the process, enabling organizations to achieve greater efficiency and effectiveness in leveraging Salesforce data to meet their business needs.

## Automation to the rescue!

[Generating an OpenAPI 3.0 document for the Salesforce sObjects REST API](https://developer.salesforce.com/docs/atlas.en-us.api_rest.meta/api_rest/openapi_beta.htm) can be a tedious and repetitive process, especially since it needs to be redone after important changes to the sObject layout, like adding new fields. Fortunately, Salesforce provides [documentation](https://developer.salesforce.com/docs/atlas.en-us.api_rest.meta/api_rest/openapi_beta.htm) to guide developers through the necessary steps, but the process could benefit from further automation. This is where our Salesforce sObject SDK Generator comes in. It utilizes the `sfdx` CLI tool to obtain an access token for the developer logged into the `sfdx` CLI. With this token, the generator automatically invokes the API endpoints in the order described in the documentation and saves the resulting data as JSON to a file. This JSON file containing the OpenAPI specification can then be utilized by other tools to generate a customized SDK tailored to the specific sObject layout of the organization. The Salesforce sObject SDK Generator reduces the time and effort required to generate a custom SDK, making the development process more efficient and reliable.

## Installation

Before getting started, make sure to install the [`sfdx` CLI](https://developer.salesforce.com/docs/atlas.en-us.sfdx_setup.meta/sfdx_setup/sfdx_setup_install_cli.htm). Alternatively, if you're on MacOS, you can install `sfdx` using Brew.

Install the Salesforce sObject SDK Generator using [`npm`](https://www.npmjs.com/):

```console
 $ npm install --save-dev @skyleague/salesforce-sobject-sdk-generator
```

## Usage

First, login using the `sfdx` CLI:

```sh
$ sfdx org login web -r https://MYDOMAINNAME--SANDBOXNAME.sandbox.my.salesforce.com
```

The Salesforce sObject SDK Generator can then be used as follows:

```sh
$ npx @skyleague/salesforce-sobject-sdk-generator \
    --out-dir ./src/vendor/salesforce-sdk \
    --api-version '56.0' \
    --org-base-url https://MYDOMAINNAME--SANDBOXNAME.sandbox.my.salesforce.com

→ Trying to find active credentials on sfdx...
→ Found credentials... {
  'https://MYDOMAINNAME--SANDBOXNAME.sandbox.my.salesforce.com': 'my@domain.email'
}
→ Searching for matching instanceUrl [expected: https://MYDOMAINNAME--SANDBOXNAME.sandbox.my.salesforce.com]
→ Found matching instanceUrl...
→ Starting oas3 generation...
→ Generated oas3 definition, replacing versions [from: 57.0, to: 56.0]
→ Writing the spec to $PWD/src/vendor/salesforce-sdk/20230309.json
```

To enhance the reproducibility and efficiency of the OpenAPI specification generation process, it is recommended to include this command in the npm scripts. This would enable new developers joining the project to easily generate the specification in a consistent manner. It is advisable to generate the SDK in your organization's Salesforce Sandbox environment rather than in the Salesforce Production environment. Doing so enables the development of new features in the Sandbox before deploying changes to the Production environment.

## Generating and using the SDK

The OpenAPI specification can be utilized in [`therefore`](https://skyleague.github.io/therefore/), a tool that automates the creation of REST API SDK clients using Swagger or OpenAPI definitions. However, it's important to consider that Salesforce permits optional properties to be nullable, and the tool responsible for converting the OpenAPI specification to an SDK must account for this. Although `therefore` has strict validation of optional properties, there is a toggle available that allows for optional properties to be nullable.

An example `therefore` schema file could look as follows:

```ts title="src/vendor/salesforce-sdk/salesforce.schema.ts"
import { pickBy } from '@skyleague/axioms'
import { $restclient } from '@skyleague/therefore'

export const salesforceClient = $restclient(require('./20230309.json'), {
    optionalNullable: true, // This toggle allows optional properties in the OpenAPI to also be nullable
    transformOpenapi: (openapi) => {
        openapi.servers = []
        const prefixes = ['/sobjects/MyObject__c', '/sobjects/MyEvent__e']
        // Select the object types we want to be able to interact with
        openapi.paths = pickBy(openapi.paths, ([p]) => prefixes.some((x) => p.startsWith(x))) as (typeof openapi)['paths']
        return openapi
    },
})
```

Once the SDK client is generated with the Therefore CLI (using `npx therefore -f src` for example), it is ready to be used in your application code, for example in AWS Lambda:

```ts title="src/functions/my-function/index.ts"
import { SalesforceClient } from '../../vendor/salesforce-sdk/salesfore.client.ts'

export async function handler(event, context) {
    const client = new SalesforceClient({
        prefixUrl: `${process.env.SALESFORCE_BASEURL}/services/data/v56.0`,
        auth: {
            bearerAuth: () => getToken(),
        },
    })

    const myObject = await client.getSobjectMyObjectCById({
        path: { id: 'my-id' },
    })
}
```
