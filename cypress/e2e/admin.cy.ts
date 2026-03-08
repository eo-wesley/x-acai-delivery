describe('Admin Flow', () => {
    before(() => {
        cy.request('POST', 'http://localhost:3000/api/dev/reset')
    })

    it('Logs in and views the orders', () => {
        cy.visit('/admin')
        cy.get('input[type="password"]').type('default_secret')
        cy.get('button').contains('Acessar').click()

        cy.url().should('include', '/admin/orders')
        cy.contains('Painel Lojista').should('be.visible')
        cy.contains('Gestão de Pedidos')
    })

    it('Navigates to CRM', () => {
        cy.visit('/admin')
        // Usually local storage remains between tests but it's safer to re-login or use programatic login
        localStorage.setItem('admin_token', 'mock_token')
        cy.visit('/admin/customers')
        cy.contains('CRM - Clientes').should('exist')
    })

    it('Navigates to Inventory', () => {
        localStorage.setItem('admin_token', 'mock_token')
        cy.visit('/admin/inventory')
        cy.contains('Estoque e Insumos').should('exist')
    })
})
