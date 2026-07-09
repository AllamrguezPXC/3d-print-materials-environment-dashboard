from datetime import datetime, timedelta, timezone


def _iso(dt: datetime) -> str:
    return dt.isoformat()


def test_history_filters_by_date_range(client):
    now = datetime.now(timezone.utc)

    # One reading now, one far in the past — the past one must not be
    # included when filtering to a narrow recent window.
    client.post(
        "/readings",
        json={
            "temperature_c": 24.0,
            "relative_humidity_percent": 30.0,
            "pressure_pa": 101000.0,
            "timestamp": _iso(now),
        },
    )
    client.post(
        "/readings",
        json={
            "temperature_c": 24.0,
            "relative_humidity_percent": 30.0,
            "pressure_pa": 101000.0,
            "timestamp": _iso(now - timedelta(days=10)),
        },
    )

    response = client.get(
        "/readings",
        params={"from": _iso(now - timedelta(minutes=5)), "to": _iso(now + timedelta(minutes=5))},
    )

    assert response.status_code == 200
    body = response.json()
    assert len(body["readings"]) == 1


def test_history_rejects_to_before_from(client):
    now = datetime.now(timezone.utc)
    response = client.get(
        "/readings",
        params={"from": _iso(now), "to": _iso(now - timedelta(days=1))},
    )
    assert response.status_code == 400


def test_history_rejects_malformed_datetime(client):
    response = client.get("/readings", params={"from": "not-a-date", "to": "also-not-a-date"})
    assert response.status_code == 400


def test_history_hourly_aggregation_averages_correctly(client):
    hour_start = datetime.now(timezone.utc).replace(minute=0, second=0, microsecond=0)

    client.post(
        "/readings",
        json={
            "temperature_c": 20.0,
            "relative_humidity_percent": 30.0,
            "pressure_pa": 100000.0,
            "timestamp": _iso(hour_start + timedelta(minutes=5)),
        },
    )
    client.post(
        "/readings",
        json={
            "temperature_c": 30.0,
            "relative_humidity_percent": 50.0,
            "pressure_pa": 102000.0,
            "timestamp": _iso(hour_start + timedelta(minutes=45)),
        },
    )

    response = client.get(
        "/readings",
        params={
            "from": _iso(hour_start),
            "to": _iso(hour_start + timedelta(hours=1)),
            "aggregate": "hour",
        },
    )

    assert response.status_code == 200
    body = response.json()
    assert len(body["hourly"]) == 1
    bucket = body["hourly"][0]
    assert bucket["temperature_c"] == 25.0
    assert bucket["relative_humidity_percent"] == 40.0
    assert bucket["pressure_pa"] == 101000.0
    assert bucket["sample_count"] == 2
