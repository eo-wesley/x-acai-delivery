describe('PDV Flow', () => {
    before(() => {
        cy.request('POST', 'http://localhost:3000/api/dev/reset')
    })

    it('Opens PDV, adds item and checks out', () => {
        // Mock Login
        localStorage.setItem('admin_token', 'mock_token')
        cy.visit('/admin/pdv')
        cy.contains('Frente de Caixa (PDV)', { timeout: 10000 }).should('exist')

        // Wait for items to load
        // Assumes there's bound to be items if reset populates them. If not, we test the UI structure.
        cy.contains('Nenhum produto encontrado').should('not.exist')

        cy.get('h3').first().click() // Click first product card

        // Checkout Section
        cy.contains('Pedido Atual').should('exist')
        cy.get('button').contains('Finalizar Venda').click()

        cy.on('window:alert', (text) => {
            expect(text).to.contains('Venda finalizada!')
        })
    })
})
