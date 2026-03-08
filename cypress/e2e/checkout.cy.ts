describe('Checkout Flow', () => {
    before(() => {
        cy.request('POST', 'http://localhost:3000/api/dev/reset')
    })

    it('Adds item to cart and creates order', () => {
        cy.visit('/')
        cy.contains('Carregando...', { timeout: 10000 }).should('not.exist')

        // Add item
        cy.get('button').contains('Adicionar', { timeout: 5000 }).first().click()

        // Go to cart
        cy.get('a[href="/cart"]').click()
        cy.url().should('include', '/cart')
        cy.contains('Seu Pedido')

        // Go to checkout
        cy.get('button').contains('Ir para Checkout').click()
        cy.url().should('include', '/checkout')

        // Fill details
        cy.get('input[placeholder="Seu nome"]').type('João Teste')
        cy.get('input[placeholder="Seu WhatsApp (apenas números)"]').type('11999999999')
        cy.get('input[placeholder="Endereço de entrega completo"]').type('Rua Teste, 123')

        // Finalize
        cy.get('button').contains('Finalizar Pedido').click()

        // Wait for redirect to order page
        cy.url({ timeout: 15000 }).should('include', '/order/')
        cy.contains('Status do Pedido:', { timeout: 10000 })
    })
})
