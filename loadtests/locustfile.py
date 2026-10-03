from locust import HttpUser, between, task


class PublicCatalogUser(HttpUser):
    wait_time = between(1, 3)

    @task(3)
    def catalog(self):
        self.client.get("/api/v1/products")

    @task(1)
    def health(self):
        self.client.get("/health/ready")
