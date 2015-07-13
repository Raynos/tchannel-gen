exception NoSuchKey {
    1:string message
}

struct HealthResult {
    1:string message
}

service MyService {
    HealthResult health_v1()

    // TODO Example endpoints; please remove.
    string get_v1(
        1:string key
    ) throws (
        1:NoSuchKey noKey
    )
    void put_v1(
        1:string key
        2:string value
    )
}
