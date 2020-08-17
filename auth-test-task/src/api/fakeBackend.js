const test = {
  email: "user@mail.com",
  firstName: "test",
  id: 2,
  lastName: "user",
  password: "123123",
  username: "user",
}

let raw = JSON.parse(localStorage.getItem('users')) || [test]
raw.push(test)

let users = [...new Set(raw)]


export function configureFakeBackend() {
  let realFetch = window.fetch
  window.fetch = function (url, opts) {
      return new Promise((resolve, reject) => {
          setTimeout(() => {

              if (url.endsWith('/users/authenticate') && opts.method === 'POST') {
                  let params = JSON.parse(opts.body)

                  let filteredUsers = users.filter(user => {
                    return user.email === params.email && user.password === params.password
                  })

                  if (filteredUsers.length) {
                      let user = filteredUsers[0]
                      let responseJson = {
                          id: user.id,
                          email: user.email,
                          username: user.username,
                          firstName: user.firstName,
                          lastName: user.lastName,
                          token: 'fake-jwt-token'
                      }
                      resolve({ ok: true, text: () => Promise.resolve(JSON.stringify(responseJson)) })
                  } else {
                      // else return error
                      reject('Username or password is incorrect')
                  }

                  return
              }

              // get users
              if (url.endsWith('/users') && opts.method === 'GET') {
                  // check for fake auth token in header and return users if valid, this security is implemented server side in a real application
                  if (opts.headers && opts.headers.Authorization === 'Bearer fake-jwt-token') {
                      resolve({ ok: true, text: () => Promise.resolve(JSON.stringify(users))})
                  } else {
                      // return 401 not authorised if token is null or invalid
                      reject('Unauthorised')
                  }

                  return
              }

              if (url.match(/\/users\/\d+$/) && opts.method === 'GET') {
                  if (opts.headers && opts.headers.Authorization === 'Bearer fake-jwt-token') {
                      let urlParts = url.split('/')
                      let id = parseInt(urlParts[urlParts.length - 1])
                      let matchedUsers = users.filter(user => { return user.id === id })
                      let user = matchedUsers.length ? matchedUsers[0] : null

                      resolve({ ok: true, text: () => JSON.stringify(user)})
                  } else {
                      reject('Unauthorised')
                  }

                  return
              }

              if (url.endsWith('/users/register') && opts.method === 'POST') {
                  let newUser = JSON.parse(opts.body)

                  let duplicateUser = users.filter(user => { return user.email === newUser.email }).length
                  if (duplicateUser) {
                      reject('Username "' + newUser.email + '" is already taken')
                      return
                  }

                  newUser.id = users.length ? Math.max(...users.map(user => user.id)) + 1 : 1
                  users.push(newUser)
                  localStorage.setItem('users', JSON.stringify(users))

                  resolve({ ok: true, text: () => Promise.resolve() })

                  return
              }

              if (url.match(/\/users\/\d+$/) && opts.method === 'DELETE') {
                  if (opts.headers && opts.headers.Authorization === 'Bearer fake-jwt-token') {
                      let urlParts = url.split('/')
                      let id = parseInt(urlParts[urlParts.length - 1])
                      for (let i = 0; i < users.length; i++) {
                          let user = users[i]
                          if (user.id === id) {
                              users.splice(i, 1)
                              localStorage.setItem('users', JSON.stringify(users))
                              break
                          }
                      }

                      resolve({ ok: true, text: () => Promise.resolve() })
                  } else {
                      reject('Unauthorised')
                  }

                  return
              }

              realFetch(url, opts).then(response => resolve(response))
          }, 500)
      })
  }
}