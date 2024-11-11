import nock from 'nock'
import { beforeAll, beforeEach, expect, it } from 'vitest'
import type { Org } from '../../lib/sfdx/org.type.js'
import { generateSobjectSpec } from './generate.js'

const instanceUrl = 'http://localhost'
const mockOrg: Org = {
    orgId: '00D1F0000008abcd',
    username: 'test@localhost',
    instanceUrl,
    accessToken: '1234567890',
}

beforeAll(() => nock.disableNetConnect())
beforeEach(() => nock.cleanAll())

it('should throw an error if getSfdxOrgInfo fails', async () => {
    await expect(
        generateSobjectSpec(
            {
                baseUrl: instanceUrl,
                apiVersion: '61.0',
                cwd: import.meta.dirname,
                resourcePaths: ['*'],
                injectQueryEndpoints: false,
            },
            { _getSfdxOrgInfo: () => Promise.reject(new Error('Failed to get org info')) },
        ),
    ).rejects.toThrow('Failed to get org info')
})

it('should throw an error if the task could not be started', async () => {
    nock(instanceUrl).post('/services/data/v61.0/async/specifications/oas3').reply(401, {
        message: 'Unauthorized',
    })

    await expect(
        generateSobjectSpec(
            {
                baseUrl: instanceUrl,
                apiVersion: '61.0',
                cwd: import.meta.dirname,
                resourcePaths: ['*'],
                injectQueryEndpoints: false,
            },
            { _getSfdxOrgInfo: () => Promise.resolve(mockOrg) },
        ),
    ).rejects.toThrow('Failed to generate, Salesforce did not return a valid response')
})

it('should be able to generate a spec', async () => {
    nock(instanceUrl).post('/services/data/v61.0/async/specifications/oas3').reply(200, {
        detailsHref: '/services/data/v61.0/async/specifications/oas3/refId',
        resultsHref: '/services/data/v61.0/async/specifications/oas3/refId/results',
        apiTaskStatus: 'COMPLETED',
    })

    const spec = {
        info: {
            version: '61.0',
        },
    }

    nock(instanceUrl).get('/services/data/v61.0/async/specifications/oas3/refId/results').reply(200, spec)

    await expect(
        generateSobjectSpec(
            {
                baseUrl: instanceUrl,
                apiVersion: '61.0',
                cwd: import.meta.dirname,
                resourcePaths: ['*'],
                injectQueryEndpoints: false,
            },
            { _getSfdxOrgInfo: () => Promise.resolve(mockOrg) },
        ),
    ).resolves.toEqual(JSON.stringify(spec, null, 2))
})

it('should be able to pick up the reference ID when the API returns a 429', async () => {
    nock(instanceUrl).post('/services/data/v61.0/async/specifications/oas3').reply(429, {
        message: 'Rate limit exceeded; refId: abcd123',
        errorCode: 'RATE_LIMIT_EXCEEDED',
        referenceId: 'refId',
    })

    const spec = {
        info: {
            version: '61.0',
        },
    }

    nock(instanceUrl).get('/services/data/v61.0/async/specifications/oas3/abcd123').reply(200, {
        apiTaskStatus: 'COMPLETED',
        detailsHref: '/services/data/v61.0/async/specifications/oas3/abcd123',
        resultsHref: '/services/data/v61.0/async/specifications/oas3/abcd123/results',
    })
    nock(instanceUrl).get('/services/data/v61.0/async/specifications/oas3/abcd123/results').reply(200, spec)

    await expect(
        generateSobjectSpec(
            {
                baseUrl: instanceUrl,
                apiVersion: '61.0',
                cwd: import.meta.dirname,
                resourcePaths: ['*'],
                injectQueryEndpoints: false,
            },
            { _getSfdxOrgInfo: () => Promise.resolve(mockOrg) },
        ),
    ).resolves.toEqual(JSON.stringify(spec, null, 2))
})

it('should be able to pick up the difference between the expected and actual API version if the URL has the wrong version', async () => {
    nock(instanceUrl).post('/services/data/v61.0/async/specifications/oas3').reply(200, {
        detailsHref: '/services/data/v62.0/async/specifications/oas3/abcd123',
        resultsHref: '/services/data/v62.0/async/specifications/oas3/abcd123/results',
        apiTaskStatus: 'COMPLETED',
    })

    const spec = {
        info: {
            version: '61.0',
        },
    }

    nock(instanceUrl).get('/services/data/v62.0/async/specifications/oas3/abcd123/results').reply(400, {
        message: 'ApiTask with id: abcd123 version: 61.0 must match ApiVersion for result retrieval: 62.0',
    })
    nock(instanceUrl).get('/services/data/v61.0/async/specifications/oas3/abcd123/results').reply(200, spec)

    await expect(
        generateSobjectSpec(
            {
                baseUrl: instanceUrl,
                apiVersion: '61.0',
                cwd: import.meta.dirname,
                resourcePaths: ['*'],
                injectQueryEndpoints: false,
            },
            { _getSfdxOrgInfo: () => Promise.resolve(mockOrg) },
        ),
    ).resolves.toEqual(JSON.stringify(spec, null, 2))
})
