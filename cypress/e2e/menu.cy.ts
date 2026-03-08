describe('Menu Flow', () => {
    before(() => {
        // Reset the database to guarantee clean state
        cy.request('POST', 'http://localhost:3000/api/dev/reset')
    })

    it('Visits the app root URL and loads the menu', () => {
        cy.visit('/')
        cy.contains('Carregando...', { timeout: 10000 }).should('not.exist')
        // Wait for at least one adding to cart button or an image to indicate load
        cy.get('button').contains('Adicionar').should('exist')
    })

    it('Searches for an item', () => {
        cy.visit('/')
        cy.get('input[type="text"]').type('Açaí')
        cy.get('button').contains('Adicionar').should('exist')
    })
})
