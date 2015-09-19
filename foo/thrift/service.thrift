exception NoSuchKey {
    1: required string message
}

struct HealthResult {
    1: required string message
}

service MyService {
    HealthResult health_v1()

    // TODO Example endpoints; please remove.
    string get_v1(
        1: required string key
    ) throws (
        1: optional NoSuchKey noKey
    )
    void put_v1(
        1: required string key
        2: required string value
    )
}
