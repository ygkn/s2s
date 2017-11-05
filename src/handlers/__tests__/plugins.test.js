// @flow
import path from 'path'
import stripAnsi from 'strip-ansi'
import KeyLocker from 'key-locker'
import * as babel from 'babel-core'
import * as utils from '../../utils'
import * as plugins from '../plugins'
import defaultHandler from '../babel-handler'
import _plugin from './helpers/identifer-reverse-plugin'

let errorSpy
let logSpy
let writeSpy

const lock = new KeyLocker()

const fn = x => x

const getEventPath = () => path.resolve(__dirname, 'fixtures', 'a.js')
jest.useFakeTimers()

beforeEach(() => {
  jest.runAllTimers()
  errorSpy = jest.spyOn(console, 'error').mockImplementation(fn)
  logSpy = jest.spyOn(utils, 'log').mockImplementation(fn)
  writeSpy = jest.spyOn(utils, 'writeFileSync').mockImplementation(fn)
})

afterEach(() => {
  errorSpy.mockRestore()
  logSpy.mockRestore()
  writeSpy.mockRestore()
})

const setup = plugin => {
  return [
    defaultHandler,
    {
      eventPath: getEventPath(),
      plugin,
      hooks: [],
    },
  ]
}

test('eventPathがMatchしないとき、handlePluginを呼ばない', () => {
  const spyFn = jest.spyOn(plugins, 'handlePlugin')
  const plugin = { test: /hoge/, plugin: _plugin }
  plugins.default(getEventPath(), 'add', [plugin])
  expect(spyFn.mock.calls.length).toBe(0)
})

test('handlePlugin when eventPath match', () => {
  const plugin = { test: /a.js/, plugin: _plugin }
  plugins.handlePlugin(...setup(plugin))
  expect(stripAnsi(logSpy.mock.calls[0][0])).toMatchSnapshot()
})

test('handlePlugin with input option', () => {
  const plugin = { test: /a.js/, plugin: _plugin, input: getEventPath() }
  plugins.handlePlugin(...setup(plugin))
  expect(writeSpy.mock.calls[0][1]).toMatchSnapshot()
})

test('handlePlugin with relative input path', () => {
  const plugin = { test: /a.js/, plugin: _plugin, input: 'b.js' }
  plugins.handlePlugin(...setup(plugin))
  expect(writeSpy.mock.calls[0][1]).toMatchSnapshot()
})

test('handlePlugin with output option', () => {
  const plugin = { test: /a.js/, plugin: _plugin, output: 'b.js' }
  plugins.handlePlugin(...setup(plugin))
  expect(writeSpy.mock.calls[0][0]).toMatch('/fixtures/b.js')
})

test('handlePlugin when output option is [name].test.js', () => {
  const plugin = { test: /a.js/, plugin: _plugin, output: '[name].test.js' }
  plugins.handlePlugin(...setup(plugin))
  expect(writeSpy.mock.calls[0][0]).toMatch('/fixtures/a.test.js')
})

test('handlePlugin write args', () => {
  const plugin = { test: /a.js/, plugin: _plugin }
  plugins.handlePlugin(...setup(plugin))
  expect(writeSpy.mock.calls[0][0]).toBe(getEventPath())
  expect(writeSpy.mock.calls[0][1]).toMatchSnapshot()
})

test('handlePlugin when compileWithPlugin returns empty code', () => {
  const spy = jest.spyOn(babel, 'transform').mockReturnValue('')
  const plugin = { test: /a.js/, plugin: _plugin }
  plugins.handlePlugin(...setup(plugin))
  expect(logSpy).not.toHaveBeenCalled()
  spy.mockRestore()
})

test('handlePlugins when locked', () => {
  lock.add(getEventPath())
  plugins.default(getEventPath(), 'add', [_plugin])
  expect(writeSpy).not.toHaveBeenCalled()
})

test('handlePlugins called write', () => {
  const opts = { test: /not-found.js/, plugin: _plugin }
  plugins.default(getEventPath(), 'add', [opts])
  expect(logSpy).not.toHaveBeenCalled()
})

test('handlePlugins handle error', () => {
  const plugin = { test: /a.js/, plugin: _plugin }
  logSpy.mockImplementation(() => {
    throw new Error('hello')
  })
  plugins.default(getEventPath(), 'add', [plugin])
  expect(errorSpy).toHaveBeenCalled()
})

test('handlePlugin when plugins = undefined', () => {
  plugins.default(getEventPath(), 'add')
  expect(logSpy).not.toHaveBeenCalled()
})

test('call write handlePlugin when only === add', () => {
  const plugin = { test: /a.js/, plugin: _plugin, only: ['add'] }
  plugins.handlePlugin(...setup(plugin))
  expect(writeSpy).toHaveBeenCalled()
})

test('onlyオプションがeventTypeと不一致のとき、hanlderを呼ばない', () => {
  const plugin = { test: /a.js/, plugin: _plugin, only: ['unlink'] }
  plugins.default(getEventPath(), 'add', [plugin])
  expect(writeSpy).not.toHaveBeenCalled()
})
