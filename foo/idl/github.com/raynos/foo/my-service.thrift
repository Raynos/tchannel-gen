exception NoSuchKey {
    1: required string message
}

service MyService {
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
