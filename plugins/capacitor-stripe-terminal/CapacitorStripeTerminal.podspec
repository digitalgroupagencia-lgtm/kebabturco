require 'json'

package = JSON.parse(File.read(File.join(__dir__, 'package.json')))

Pod::Spec.new do |s|
  s.name = 'CapacitorStripeTerminal'
  s.version = package['version']
  s.summary = 'Stripe Terminal Tap to Pay'
  s.license = 'MIT'
  s.homepage = 'https://github.com/digitalgroupagencia-lgtm/kebabturco'
  s.author = 'Kebab Turco'
  s.source = { :git => 'https://github.com/digitalgroupagencia-lgtm/kebabturco.git', :tag => s.version.to_s }
  s.source_files = 'ios/Sources/**/*.{swift,h,m,c,cc,mm,cpp}'
  s.ios.deployment_target = '15.0'
  s.dependency 'Capacitor'
  s.dependency 'StripeTerminal', '~> 4.0'
  s.swift_version = '5.9'
end
