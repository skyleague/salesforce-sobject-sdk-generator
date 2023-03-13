import type { OpenapiV3 } from '@skyleague/therefore'

export const queryResponse = {
    description: 'Status Code 200',
    content: {
        'application/xml': {
            schema: {
                $ref: '#/components/schemas/QueryResponse',
            },
        },
        'application/json': {
            schema: {
                $ref: '#/components/schemas/QueryResponse',
            },
        },
    },
}
export const queryErrorResponses = Object.fromEntries(
    [304, 400, 401, 403, 404, 405, 412, 500, 503].map((status) => [
        status,
        {
            description: `Status Code ${status}`,
            content: {
                'application/xml': {
                    schema: {
                        $ref: '#/components/schemas/QueryErrorResponse',
                    },
                },
                'application/json': {
                    schema: {
                        $ref: '#/components/schemas/QueryErrorResponse',
                    },
                },
            },
        },
    ])
)

export function injectQueryPaths(spec: Partial<OpenapiV3>): Partial<OpenapiV3> {
    return {
        ...spec,
        paths: {
            ...spec.paths,
            '/query': {
                get: {
                    parameters: [{ in: 'query', name: 'q', required: true, schema: { type: 'string' } }],
                    responses: {
                        200: queryResponse,
                        ...queryErrorResponses,
                    },
                },
            },
            '/query/{queryLocator}': {
                get: {
                    parameters: [{ in: 'path', name: 'queryLocator', required: true, schema: { type: 'string' } }],
                    responses: {
                        200: queryResponse,
                        ...queryErrorResponses,
                    },
                },
            },
            '/queryAll': {
                get: {
                    parameters: [{ in: 'query', name: 'q', required: true, schema: { type: 'string' } }],
                    responses: {
                        200: queryResponse,
                        ...queryErrorResponses,
                    },
                },
            },
            '/queryAll/{queryLocator}': {
                get: {
                    parameters: [{ in: 'path', name: 'queryLocator', required: true, schema: { type: 'string' } }],
                    responses: {
                        200: queryResponse,
                        ...queryErrorResponses,
                    },
                },
            },
        },
        components: {
            ...spec.components,
            schemas: {
                ...spec.components?.schemas,
                QueryResponse: {
                    type: 'object',
                    properties: {
                        totalSize: { type: 'number' },
                        done: { type: 'boolean' },
                        nextRecordsUrl: { type: 'string' },
                        records: {
                            type: 'array',
                            items: {},
                        },
                    },
                    required: ['done', 'records', 'totalSize'],
                },
                QueryErrorResponse: {
                    type: 'object',
                    properties: {
                        message: { type: 'string' },
                        errorCode: { type: 'string' },
                        fields: { type: 'array', items: { type: 'string' } },
                    },
                    required: ['message', 'errorCode'],
                },
            },
        },
    }
}
