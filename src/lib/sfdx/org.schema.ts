import { $array, $object, $ref, $string } from '@skyleague/therefore'

export const org = $object({
    orgId: $string,
    username: $string,
    instanceUrl: $string,
    accessToken: $string,
}).validator()

export const orgList = $object({
    result: $array($ref(org)),
}).validator()
