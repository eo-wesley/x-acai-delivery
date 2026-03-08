# X-Açaí Delivery SaaS

## Project Purpose

The project is a multi-tenant SaaS delivery platform inspired by:
- Cardápio Web
- MenuDino
- Delivery Direto
- Saipos
- iFood white-label systems.

It allows restaurants to operate their own delivery app and management system.

## Core modules

Customer ordering experience  
Restaurant admin dashboard  
PDV / POS  
Inventory and recipes  
CRM customer history  
PIX payments via Mercado Pago  
WhatsApp notifications  
Coupons and reviews  
Multi-tenant architecture.

## Technology stack

Backend:
Express
TypeScript
SQLite

Frontend:
Next.js 15
React

Mobile:
Flutter

Infrastructure:
Docker
GitHub
CI/CD

## Order flow

menu → product → cart → checkout → PIX payment → order tracking → delivery

## Multi tenant structure

restaurants table controls tenant isolation.

Each order, menu item, and customer is associated with restaurant_id.
