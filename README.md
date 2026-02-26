# X-Açaí Delivery 🍇

Aplicativo de delivery (cliente + motoboy + painel admin/CRM) com arquitetura escalável para multiloja/franquias.

## Apps
- **client_app**: app do cliente (pedido, acompanhamento)
- **driver_app**: app do motoboy (aceitar entrega, rotas, status, tracking)
- **admin_dashboard**: painel web (CRM, pedidos, estoque, lucro)

## Stack
- Flutter (Android/iOS)
- Firebase (Auth, Firestore, Functions, Storage)
- Maps/Tracking (fase posterior)

## Como rodar (cliente)
No PowerShell:

cd apps\client_app
flutter pub get
flutter run
