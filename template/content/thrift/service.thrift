struct HealthResult {
    1:string message
}

service MyService {
    HealthResult health_v1()

    // Example endpoints; please remove.
    string get_v1(
        1:string key
    )
    void put_v1(
        1:string key
        2:string value
    )
}
