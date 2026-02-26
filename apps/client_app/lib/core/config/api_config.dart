/// Backend API configuration and client
class ApiConfig {
  // Backend URL (change to your backend server)
  static const baseUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: 'http://localhost:3000', // Local dev
  );

  // Alternatively, use a direct URL:
  // static const baseUrl = 'https://xacai-backend.run.app';

  static const healthEndpoint = '/health';
  static const ordersEndpoint = '/api/orders';
  static const webhookEndpoint = '/webhook';

  static String getFullUrl(String path) => '$baseUrl$path';
}
