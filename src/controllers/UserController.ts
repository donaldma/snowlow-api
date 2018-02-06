'use strict'

import * as uuid from 'uuid'
import dynamodb from '../config/database'
// import { TokenService } from '../services/TokenService'
import UserService from '../services/UserService'
import RequestValidation from '../utilities/RequestValidation'
import UserRepository from '../repositories/UserRepository'

/**
 * Create a user
 */
module.exports.create = (event, context, callback) => {
  const timestamp = new Date()
  const data = JSON.parse(event.body)
  if (typeof data.text !== 'string') {
    console.error('Validation Failed')
    callback(null, {
      statusCode: 400,
      headers: { 'Content-Type': 'text/plain' },
      body: 'Couldn\'t create the todo item.'
    })
    return
  }
  
  const params = {
    TableName: process.env.USER_TABLE!,
    Item: {
      id: uuid.v1(),
      text: data.text,
      checked: false,
      createdAt: timestamp,
      updatedAt: timestamp
    }
  }

  dynamodb.put(params, (error) => {
    if (error) {
      console.error(error)
      callback(null, {
        statusCode: error.statusCode || 500,
        headers: { 'Content-Type': 'text/plain' },
        body: 'Couldn\'t create the todo item.'
      })
      return
    }

    const response = {
      body: JSON.stringify(params.Item)
    }
    callback(null, response)
  })
}

/**
 * Register a new user
 */
module.exports.register = async (event, context, callback) => {
  const data = JSON.parse(event.body)

  const validation = await RequestValidation.validateUserRegistration(data)

  if (validation) {
    console.error('Validation Failed')
    callback(null, {
      statusCode: 400,
      headers: { 'Content-Type': 'text/plain' },
      body: `Error message: ${validation}`
    })
    return
  }
  
  const params = {
    tableName: process.env.USER_TABLE!,
    id: uuid.v4(),
    email: data.email,
    password: data.password,
    name: data.name,
    location: data.location,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }

  await UserService.registerEmail(params, callback)
}

/**
 * Get a user by id
 */
module.exports.get = async (event, context, callback) => {
  const params = {
    TableName: process.env.USER_TABLE!,
    Key: {
      id: event.pathParameters.id
    }
  }

  await UserRepository.findById(params, callback)
}

/**
 * Get all users
 */
module.exports.getAll = (event, context, callback) => {
  const params = {
    TableName: process.env.USER_TABLE!
  }

  dynamodb.scan(params, (error, result) => {
    if (error) {
      console.error(error)
      callback(null, {
        statusCode: error.statusCode || 501,
        headers: { 'Content-Type': 'text/plain' },
        body: 'Couldn\'t fetch the todo item.'
      })
      return
    }

    const response = {
      body: JSON.stringify(result.Items)
    }
    callback(null, response)
  })
}

/**
 * Update a user by id
 */
module.exports.update = (event, context, callback) => {
  const timestamp = new Date().getTime()
  const data = JSON.parse(event.body)

  if (typeof data.text !== 'string' || typeof data.checked !== 'boolean') {
    console.error('Validation Failed')
    callback(null, {
      statusCode: 400,
      headers: { 'Content-Type': 'text/plain' },
      body: 'Couldn\'t update the todo item.'
    })
    return
  }

  const params = {
    TableName: process.env.USER_TABLE!,
    Key: {
      id: event.pathParameters.id
    },
    ExpressionAttributeNames: {
      '#todo_text': 'text'
    },
    ExpressionAttributeValues: {
      ':text': data.text,
      ':checked': data.checked,
      ':updatedAt': timestamp
    },
    UpdateExpression: 'SET #todo_text = :text, checked = :checked, updatedAt = :updatedAt',
    ReturnValues: 'ALL_NEW'
  }

  dynamodb.update(params, (error, result) => {
    if (error) {
      console.error(error)
      callback(null, {
        statusCode: error.statusCode || 501,
        headers: { 'Content-Type': 'text/plain' },
        body: 'Couldn\'t update the todo item.'
      })
      return
    }

    const response = {
      body: JSON.stringify(result.Attributes)
    }
    callback(null, response)
  })
}

/**
 * Delete a user by id
 */
module.exports.delete = (event, context, callback) => {
  const params = {
    TableName: process.env.USER_TABLE!,
    Key: {
      id: event.pathParameters.id
    }
  }

  dynamodb.delete(params, (error) => {
    if (error) {
      console.error(error)
      callback(null, {
        statusCode: error.statusCode || 501,
        headers: { 'Content-Type': 'text/plain' },
        body: 'Couldn\'t remove the todo item.'
      })
      return
    }

    const response = {
      body: JSON.stringify({})
    }
    callback(null, response)
  })
}

/**
 * Delete all
 */
module.exports.deleteAll = async (event, context, callback) => {
  const getParams = {
    TableName: process.env.USER_TABLE!
  }

  const users = await UserRepository.findAllUsers(getParams)

  users!.forEach(user => {
    const params = {
      TableName: process.env.USER_TABLE!,
      Key: {
        id: user.id
      }
    }
  
    dynamodb.delete(params, (error) => {
      if (error) {
        console.error(error)
        callback(null, {
          statusCode: error.statusCode || 501,
          headers: { 'Content-Type': 'text/plain' },
          body: 'Couldn\'t remove users.'
        })
        return
      }
  
      const response = {
        body: JSON.stringify(`${users!.length} users deleted`)
      }
      callback(null, response)
    })
  })
  

}