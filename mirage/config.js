export default function() {

  // These comments are here to help you get started. Feel free to delete them.

  /*
    Config (with defaults).

    Note: these only affect routes defined *after* them!
  */

  // this.urlPrefix = '';    // make this `http://localhost:8080`, for example, if your API is on a different server
  // this.namespace = '';    // make this `/api`, for example, if your API is namespaced
  // this.timing = 400;      // delay for each request, automatically set to 0 during testing

  /*
    Shorthand cheatsheet:

    this.get('/posts');
    this.post('/posts');
    this.get('/posts/:id');
    this.put('/posts/:id'); // or this.patch
    this.del('/posts/:id');

    http://www.ember-cli-mirage.com/docs/v0.3.x/shorthands/
  */
  this.logging = false;
  this.urlPrefix = 'http://localhost:8090';
  this.namespace = '/api';
  //this.passthrough('http://localhost:8090/rdf4j/repositories/test', 'http://localhost:8090/rdf4j/repositories/test/statements')
  // Ignore the following requests:
  //this.passthrough('http://localhost:8090/rdf4j/repositories/test', 'http://localhost:8090/rdf4j/repositories/test/statements')
  this.passthrough('http://localhost:8090/rdf4j/repositories/**')
  
  this.get('/behaviors/nodes', function() {
    return {
      data: [
        // nodes
        {
          type: 'behaviors/node',
          id: 'a',
          attributes: {
            name: 'alpha',
            link: 'http://google.com',
            description: 'This is the alpha node (no omega required)'
          }
        },
        {
          type: 'behaviors/node',
          id: 'b'
        },
        {
          type: 'behaviors/node',
          id: 'c'
        },
        {
          type: 'behaviors/node',
          id: 'd'
        },
        {
          type: 'behaviors/node',
          id: 'e'
        },
        {
          type: 'behaviors/node',
          id: 'f'
        },
        {
          type: 'behaviors/node',
          id: 'g'
        },
        {
          type: 'behaviors/node',
          id: 'h'
        }
      ]
    };
  });

  this.get('/behaviors/edges', function() {
    return {
      // edges
      data: [{
          type: 'behaviors/edge',
          id: 'ab',
          attributes: {
            name: 'a-b',
            source: 'a',
            target: 'b'
          },
          /* relationships:{
            source: {

                    id: 'a',
                    type: 'behaviors/node'

            },
            target: {
                data: {
                    id: 'b',
                    type: 'behaviors/node'
                }
            }
          }*/
        },
        {
          type: 'behaviors/edge',
          id: 'cd',
          attributes: {
            name: 'c-d',
            source: 'c',
            target: 'd'
          },
        },
        {
          type: 'behaviors/edge',
          id: 'ef',
          attributes: {
            name: 'e-f',
            source: 'e',
            target: 'f'
          },
        },
        {
          type: 'behaviors/edge',
          id: 'eg',
          attributes: {
            name: 'e-g',
            source: 'e',
            target: 'g'
          },
        },
        {
          type: 'behaviors/edge',
          id: 'dh',
          attributes: {
            name: 'd-h',
            source: 'd',
            target: 'h'
          },
        },
        {
          type: 'behaviors/edge',
          id: 'ac',
          attributes: {
            name: 'a-c',
            source: 'a',
            target: 'c'
          },
        },
        {
          type: 'behaviors/edge',
          id: 'be',
          attributes: {
            name: 'b-e',
            source: 'b',
            target: 'e'
          },
        }
      ]
    };
  });
}
