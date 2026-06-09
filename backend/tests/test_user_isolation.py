"""Tests that one user's data is invisible/untouchable by another."""


def test_register_clones_master_seed(client, master_seed):
    """A new user should receive a copy of every master-template word."""
    resp = client.post(
        "/api/auth/register",
        json={"email": "newbie@test.com", "password": "pw1234"},
    )
    token = resp.json()["access_token"]
    words = client.get(
        "/api/words", headers={"Authorization": f"Bearer {token}"}
    ).json()
    # master_seed inserts 3 words; the new user should have all 3
    assert len(words) == 3
    assert {w["word"] for w in words} == {"apple", "dog", "תפוח"}


def test_two_users_get_independent_decks(client, master_seed, alice_headers, bob_headers):
    alice_words = client.get("/api/words", headers=alice_headers).json()
    bob_words = client.get("/api/words", headers=bob_headers).json()
    # Same count, but different rows (different IDs because they're separate copies)
    assert len(alice_words) == 3
    assert len(bob_words) == 3
    alice_ids = {w["id"] for w in alice_words}
    bob_ids = {w["id"] for w in bob_words}
    assert alice_ids.isdisjoint(bob_ids), "Alice and Bob must own disjoint rows"


def test_user_cannot_list_other_users_words(
    client, master_seed, alice, alice_headers, bob_headers
):
    """When Alice creates a custom word, Bob shouldn't see it."""
    client.post(
        "/api/words",
        json={"word": "custom-alice-word", "language": "en"},
        headers=alice_headers,
    )
    bob_words = client.get("/api/words", headers=bob_headers).json()
    assert all(w["word"] != "custom-alice-word" for w in bob_words)


def test_user_cannot_patch_anothers_word(
    client, master_seed, alice_headers, bob_headers
):
    # Alice's first word
    alice_words = client.get("/api/words", headers=alice_headers).json()
    target_id = alice_words[0]["id"]
    # Bob tries to update it
    resp = client.patch(
        f"/api/words/{target_id}",
        json={"is_selected": True},
        headers=bob_headers,
    )
    assert resp.status_code == 404, "Bob must get a 404 — no leak that the row exists"


def test_user_cannot_delete_anothers_word(
    client, master_seed, alice_headers, bob_headers
):
    alice_words = client.get("/api/words", headers=alice_headers).json()
    target_id = alice_words[0]["id"]
    resp = client.delete(f"/api/words/{target_id}", headers=bob_headers)
    assert resp.status_code == 404
    # Confirm the row still exists for Alice
    still_there = client.get("/api/words", headers=alice_headers).json()
    assert any(w["id"] == target_id for w in still_there)


def test_words_endpoint_requires_auth(client):
    resp = client.get("/api/words")
    assert resp.status_code == 401


def test_create_word_requires_auth(client):
    resp = client.post("/api/words", json={"word": "x", "language": "en"})
    assert resp.status_code == 401


def test_bulk_select_only_affects_callers_words(
    client, master_seed, alice_headers, bob_headers
):
    """If Bob sends Alice's word IDs to bulk-select, nothing happens — his
    filter excludes them."""
    alice_words = client.get("/api/words", headers=alice_headers).json()
    alice_ids = [w["id"] for w in alice_words]

    resp = client.post(
        "/api/words/bulk-select",
        json={"ids": alice_ids, "is_selected": True},
        headers=bob_headers,
    )
    assert resp.status_code == 200
    assert resp.json() == []  # nothing matched Bob's filter

    # Alice's words remain unstarred
    refreshed = client.get("/api/words", headers=alice_headers).json()
    assert all(not w["is_selected"] for w in refreshed)
