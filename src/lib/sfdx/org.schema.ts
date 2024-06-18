import { $array, $object, $ref, $string, $validator } from '@skyleague/therefore'

export const org = $validator(
    $object({
        orgId: $string,
        username: $string,
        instanceUrl: $string,
        accessToken: $string,
    }),
)
export const orgList = $validator(
    $object({
        result: $array($ref(org)),
    }),
)
