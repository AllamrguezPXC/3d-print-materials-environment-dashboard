def test_get_current_reading_returns_mock_data(client):
    response = client.get("/readings/current")

    assert response.status_code == 200
    body = response.json()

    assert isinstance(body["temperature_c"], (int, float))
    assert isinstance(body["relative_humidity_percent"], (int, float))
    assert "pressure_pa" in body or "pressure_kpa" in body
    assert "timestamp" in body
    assert body["source"] == "mock"
    assert "sensor" in body
    assert body["sensor"]["serial_number"] == "E25877"
